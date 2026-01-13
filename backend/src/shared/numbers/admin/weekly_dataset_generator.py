from __future__ import annotations

import random
from datetime import datetime, timezone

from src.shared.numbers.blueprints import NumberType
from src.shared.numbers.number_generator import sample_digits_for_type
from src.shared.numbers.convert import number_to_spoken_chunks
from src.shared.numbers.prosody_formatter import format_with_pauses
from src.shared.numbers.sentence_blueprints import (
    get_sentence_blueprints_by_type,
)
from src.shared.numbers.admin.admin_sentence_generator import (
    generate_sentence,
)
from src.shared.numbers.models.stored import NumberDictationExercise
from src.infra.tts.tts_service import TTSService
from src.shared.numbers.admin.audio_storage import AdminAudioStorage
from src.shared.numbers.admin.dataset_writer import AdminDatasetWriter
from src.shared.numbers.models.voices import FrenchVoice

from src.extensions import logger

# ============================================================
# Helpers
# ============================================================


def current_week_tag() -> str:
    """
    Return ISO week tag, e.g. '2025-W37'.
    """
    now = datetime.utcnow()
    year, week, _ = now.isocalendar()
    return f"{year}-W{week:02d}"


# ============================================================
# Weekly Dataset Generator (ADMIN ONLY)
# ============================================================


class WeeklyNumbersDatasetGenerator:
    """
    Admin-only batch generator for Numbers Dictation datasets.

    This is the ONLY place where:
    - AI (LLM)
    - TTS (Azure Speech)
    is allowed.

    Output is an immutable, Drive-backed dataset.
    """

    def __init__(
        self,
        *,
        audio_storage: AdminAudioStorage,
        dataset_writer: AdminDatasetWriter,
        tts: TTSService,
        seed: int | None = None,
    ) -> None:
        self.audio_storage = audio_storage
        self.dataset_writer = dataset_writer
        self.tts = tts

        self.seed = seed or int(datetime.now().timestamp())
        self._rng = random.Random(self.seed)

        # All available French voices
        self.voices = list(FrenchVoice)

    # --------------------------------------------------------
    # Core generation
    # --------------------------------------------------------

    def generate(
        self,
        *,
        version_tag: str | None = None,
        per_type_counts: dict[NumberType, int],
    ) -> dict[str, int]:
        """
        Generate a full Numbers Dictation dataset and store it.

        Returns stats:
        {
          "PHONE": 100,
          "YEAR": 50,
          "PRICE": 30
        }
        """

        version = version_tag or current_week_tag()
        created_at = datetime.now(timezone.utc)

        stats: dict[str, int] = {}

        # Prepare dataset folder + manifest
        self.dataset_writer.start_version(version)

        for number_type, count in per_type_counts.items():
            if count <= 0:
                continue

            sentence_blueprints = get_sentence_blueprints_by_type(number_type)
            if not sentence_blueprints:
                raise ValueError(f"No sentence blueprints for {number_type}")

            generated = 0

            for _ in range(count):
                # --------------------------------------------------
                # 0. Choose voice (deterministic per generator seed)
                # --------------------------------------------------
                voice = self._rng.choice(self.voices)

                # --------------------------------------------------
                # 1. Generate digits (deterministic)
                # --------------------------------------------------
                digits = sample_digits_for_type(
                    number_type,
                    seed=self._rng.randint(0, 2**31 - 1),
                )

                # --------------------------------------------------
                # 2. Convert digits → spoken chunks
                # --------------------------------------------------
                spoken_chunks = number_to_spoken_chunks(digits, number_type)

                # --------------------------------------------------
                # 3. Choose sentence blueprint
                # --------------------------------------------------
                blueprint = self._rng.choice(sentence_blueprints)

                # --------------------------------------------------
                # 4. Generate sentence (LLM)
                # --------------------------------------------------
                try:
                    sentence = generate_sentence(
                        spoken_chunks, blueprint, max_attempts=1
                    )
                except Exception as e:
                    logger.warning(f"[DATASET] failed to generate sentence: {e}")
                    continue

                # --------------------------------------------------
                # 5. Add pedagogical pauses
                # --------------------------------------------------
                pause = self._rng.choice([True, False])
                sentence_with_pauses = format_with_pauses(
                    sentence,
                    spoken_chunks,
                    pause=pause,
                )

                # --------------------------------------------------
                # 6. Generate audio (Azure TTS)
                # --------------------------------------------------
                audio_bytes = self.tts.synthesize(
                    sentence_with_pauses,
                    voice=voice,
                )

                # --------------------------------------------------
                # 7. Stable, voice-safe exercise ID
                # --------------------------------------------------
                exercise_id = (
                    f"{number_type.value.lower()}_"
                    f"{digits}_"
                    f"{blueprint.id}_"
                    f"{voice}"
                )

                # --------------------------------------------------
                # 8. Persist audio
                # --------------------------------------------------
                audio_ref = self.audio_storage.save_audio(
                    audio_bytes=audio_bytes,
                    exercise_id=exercise_id,
                    version=version,
                )

                # --------------------------------------------------
                # 9. Persist exercise metadata
                # --------------------------------------------------
                exercise = NumberDictationExercise(
                    id=exercise_id,
                    number_type=number_type,
                    digits=digits,
                    spoken_chunks=spoken_chunks,
                    sentence=sentence_with_pauses,
                    audio_ref=audio_ref,
                    blueprint_id=blueprint.id,
                    version_tag=version,
                    voice=voice,
                    created_at=created_at,
                )

                self.dataset_writer.add_exercise(exercise)
                generated += 1

            stats[number_type.value] = generated

        # ------------------------------------------------------
        # 10. Write manifest.json ONCE
        # ------------------------------------------------------
        self.dataset_writer.flush()

        return stats
