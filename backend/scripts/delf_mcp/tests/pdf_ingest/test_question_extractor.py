"""Tests for question extraction (flat / nested MCQ + warn-and-skip)."""

from __future__ import annotations

import os
import sys

_BACKEND_DIR = os.path.dirname(
    os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    )
)
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from scripts.delf_mcp.pdf_ingest import warnings as warning_codes
from scripts.delf_mcp.pdf_ingest.manifest import ImageOptionCrop
from scripts.delf_mcp.pdf_ingest.question_extractor import (
    DEFAULT_POINTS,
    extract_exercise,
)

CE_SINGLE_QUESTION_TEXT = """
Compréhension écrite
Lisez l'article suivant et répondez à la question.

Paris est la capitale de la France.

1. Quelle est la capitale de la France ?
a) Lyon
b) Paris
c) Marseille
""".strip()


CE_MULTI_QUESTION_TEXT = """
Compréhension écrite
Lisez l'article ci-dessous.

Le marché du dimanche est très populaire à Lyon.

1. Quand le marché a-t-il lieu ?
a) Le samedi
b) Le dimanche
c) Le lundi

2. Le marché est-il populaire ?
a) Oui
b) Non
""".strip()


def test_flat_mcq_extracted_from_single_question_activity():
    result = extract_exercise(
        activity_number=1,
        title="Activité 1",
        activity_text=CE_SINGLE_QUESTION_TEXT,
        answer_key={1: 1},
    )
    assert result.skipped is False
    assert result.exercise is not None
    ex = result.exercise
    assert ex["type"] == "multiple_choice"
    assert ex["options"] == ["Lyon", "Paris", "Marseille"]
    assert ex["correct_answer"] == 1
    assert ex["points"] == DEFAULT_POINTS
    assert "document" in ex
    assert "Paris est la capitale" in ex["document"]["content"]


def test_nested_mcq_extracted_from_multi_question_activity():
    result = extract_exercise(
        activity_number=2,
        title="Activité 2",
        activity_text=CE_MULTI_QUESTION_TEXT,
        answer_key={1: 1, 2: 0},
    )
    assert result.skipped is False
    ex = result.exercise
    assert ex["type"] == "reading_comprehension"
    assert "questions" in ex
    assert len(ex["questions"]) == 2
    assert ex["questions"][0]["correct_answer"] == 1
    assert ex["questions"][1]["correct_answer"] == 0
    assert "options" not in ex  # flat MCQ fields must be absent
    assert "Le marché du dimanche" in ex["document"]["content"]


def test_missing_answer_key_surfaces_warning_but_still_extracts():
    result = extract_exercise(
        activity_number=1,
        title="Activité 1",
        activity_text=CE_SINGLE_QUESTION_TEXT,
        answer_key=None,
    )
    assert result.skipped is False
    assert result.exercise is not None
    assert result.exercise["correct_answer"] is None
    codes = {w["code"] for w in result.warnings}
    assert warning_codes.MISSING_ANSWER_KEY in codes


def test_image_option_activity_is_skipped():
    text = (
        "Activité 3\n"
        "Compréhension écrite\n"
        "Cochez la photo qui correspond.\n\n"
        "1. Trouvez l'image\n"
    )
    result = extract_exercise(
        activity_number=3,
        title="Activité 3",
        activity_text=text,
    )
    assert result.skipped is True
    assert result.skip_reason == warning_codes.IMAGE_OPTION_DETECTED
    assert result.exercise is None


def test_matching_activity_is_skipped():
    text = (
        "Activité 4\n"
        "Compréhension écrite\n"
        "Associez chaque personne à un document.\n\n"
        "1. Marie\n2. Pierre\n3. Jean\n"
    )
    result = extract_exercise(
        activity_number=4,
        title="Activité 4",
        activity_text=text,
    )
    assert result.skipped is True
    assert result.skip_reason == warning_codes.MATCHING_EXERCISE_DETECTED


def test_no_questions_detected_is_skipped():
    text = "Activité 5\nIntroduction sans question."
    result = extract_exercise(
        activity_number=5,
        title="Activité 5",
        activity_text=text,
    )
    assert result.skipped is True
    assert result.skip_reason == warning_codes.UNCLASSIFIED_ACTIVITY


def test_points_defaulted_warning_is_emitted():
    result = extract_exercise(
        activity_number=1,
        title="Activité 1",
        activity_text=CE_SINGLE_QUESTION_TEXT,
        answer_key={1: 1},
    )
    codes = {w["code"] for w in result.warnings}
    assert warning_codes.POINTS_DEFAULTED in codes


# ---------------------------------------------------------------------------
# v2 — image option support
# ---------------------------------------------------------------------------


def _crop(question_number: int, label: str) -> ImageOptionCrop:
    return ImageOptionCrop(
        question_number=question_number,
        label=label,
        local_path=f"/tmp/{question_number}-{label}.webp",
        page_number=1,
        bbox=(0.0, 0.0, 100.0, 100.0),
        img_url=f"assets/tp-99/q{question_number:02d}/{label}.webp",
        desc="",
    )


def test_image_option_activity_uses_crops_instead_of_skipping():
    text = (
        "Activité 3\n"
        "Compréhension écrite\n"
        "Cochez la photo qui correspond.\n\n"
        "1. Quelle scène ?\n"
    )
    crops = [_crop(1, "a"), _crop(1, "b"), _crop(1, "c")]
    result = extract_exercise(
        activity_number=3,
        title="Activité 3",
        activity_text=text,
        answer_key={1: 1},
        image_option_crops=crops,
    )
    assert result.skipped is False
    ex = result.exercise
    assert ex["type"] == "multiple_choice_image"
    assert [o["label"] for o in ex["options"]] == ["a", "b", "c"]
    assert ex["options"][0]["img_url"].startswith("assets/tp-99/q01/")
    assert ex["correct_answer"] == 1


def test_image_option_synthesizes_questions_when_text_has_none():
    text = "Activité 4\nCochez la photo correspondante.\n"
    crops = [_crop(1, "a"), _crop(1, "b"), _crop(2, "a"), _crop(2, "b")]
    result = extract_exercise(
        activity_number=4,
        title="Activité 4",
        activity_text=text,
        answer_key={1: 0, 2: 1},
        image_option_crops=crops,
    )
    assert result.skipped is False
    ex = result.exercise
    # Two distinct rows of crops → nested questions.
    assert "questions" in ex
    assert len(ex["questions"]) == 2
    assert ex["questions"][0]["type"] == "multiple_choice_image"
    assert ex["questions"][1]["type"] == "multiple_choice_image"


def test_image_option_without_crops_still_skips():
    text = "Activité 5\n" "Cochez la photo qui correspond.\n\n" "1. Trouvez l'image\n"
    result = extract_exercise(
        activity_number=5,
        title="Activité 5",
        activity_text=text,
    )
    assert result.skipped is True
    assert result.skip_reason == warning_codes.IMAGE_OPTION_DETECTED


# ---------------------------------------------------------------------------
# v3 — transcript attaches to exercise
# ---------------------------------------------------------------------------


def test_transcript_is_attached_to_flat_exercise():
    result = extract_exercise(
        activity_number=10,
        title="Activité 10",
        activity_text=CE_SINGLE_QUESTION_TEXT,
        answer_key={1: 1},
        transcript="Bonjour, voici l'enregistrement.",
    )
    assert result.exercise["transcript"] == "Bonjour, voici l'enregistrement."


def test_transcript_is_attached_to_nested_exercise():
    result = extract_exercise(
        activity_number=11,
        title="Activité 11",
        activity_text=CE_MULTI_QUESTION_TEXT,
        answer_key={1: 1, 2: 0},
        transcript="Dialogue entre Marie et Pierre.",
    )
    assert result.exercise["transcript"] == "Dialogue entre Marie et Pierre."


def test_transcript_absent_when_not_provided():
    result = extract_exercise(
        activity_number=12,
        title="Activité 12",
        activity_text=CE_SINGLE_QUESTION_TEXT,
        answer_key={1: 1},
    )
    assert "transcript" not in result.exercise
