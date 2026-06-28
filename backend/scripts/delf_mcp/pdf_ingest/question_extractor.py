"""Turn one activity's text into a DelfExercise dict (or warn-and-skip).

Scope:
- v1: Flat MCQ (one question) and nested MCQ (multiple). Text-only options
  labeled `a)` / `b)` / `c)` / `d)`. Matching exercises → warn-and-skip.
- v2: CE image-option questions. When the caller supplies
  `image_option_crops` for an activity, options become `DelfImageOption`
  dicts referring to the cropped WebP paths (filled by preview).
- v3: CO transcripts. When the caller supplies `transcript`, it lands on
  the resulting exercise's `transcript` field.

The output dict shape matches `DelfExercise` so it slots into
`DelfTestPaper.exercises` directly. Validation runs again at preview/save.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from typing import Any

from . import warnings as warning_codes
from .manifest import ImageOptionCrop

# Default points-per-question when the PDF doesn't expose values. The plan
# (D9) commits to 1.0 across v1.
DEFAULT_POINTS = 1.0

# Question header. Matches "1.", "1)", "Question 1", "Q1." at the start of
# a line. The activity-header line ("Activité 1") is *not* matched because
# this regex is anchored after the activity boundary text is stripped.
_QUESTION_HEADER = re.compile(
    r"^\s*(?:question\s+)?(\d{1,2})\s*[\.\)]\s+(.+?)$",
    re.IGNORECASE | re.MULTILINE,
)

# Option header. Matches "a)", "a.", "A.", "A)" at the start of a line.
_OPTION_HEADER = re.compile(
    r"^\s*([a-fA-F])\s*[\.\)]\s+(.+?)$",
    re.MULTILINE,
)

# Image-option cues. If the activity text mentions images/photos in the
# instructions AND has very few text-only options, v1 skips with a warning.
_IMAGE_CUE_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(
        r"\b(?:cochez|choisissez)\s+(?:la\s+|l['’]\s*)?(?:photo|image|dessin)",
        re.IGNORECASE,
    ),
    re.compile(
        r"\bassociez\s+(?:les|chaque)\s+(?:photo|image|dessin)",
        re.IGNORECASE,
    ),
)

# Matching-exercise cues.
_MATCHING_CUE_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"\bassociez\b", re.IGNORECASE),
    re.compile(r"\breliez\b", re.IGNORECASE),
    re.compile(r"\bfaites\s+correspondre\b", re.IGNORECASE),
)


@dataclass
class ExtractedQuestion:
    """One question's parsed text + options + correct answer."""

    number: int
    question_text: str
    options: list[str] = field(default_factory=list)
    correct_answer: int | None = None
    points: float = DEFAULT_POINTS


@dataclass
class ExtractionResult:
    """Outcome of running the extractor on one activity.

    `exercise` is None when the activity was skipped (warn-and-skip). The
    skip reason is encoded as a warning in `warnings`.
    """

    exercise: dict[str, Any] | None
    questions: list[ExtractedQuestion] = field(default_factory=list)
    warnings: list[dict[str, Any]] = field(default_factory=list)
    skipped: bool = False
    skip_reason: str | None = None


def _normalize(text: str) -> str:
    """Lower + strip accents for tolerant pattern matching."""
    decomposed = unicodedata.normalize("NFD", text)
    stripped = "".join(c for c in decomposed if not unicodedata.combining(c))
    return stripped.lower()


def _detect_skip_reason(
    text: str,
    questions: list[ExtractedQuestion],
    *,
    has_image_crops: bool = False,
) -> str | None:
    """Return a skip reason if the activity is out of scope.

    When `has_image_crops` is True, image-option activities are NOT skipped
    — v2 supplies real crops, so the extractor builds DelfImageOption
    entries instead. Matching exercises still skip (v1 scope cap).
    """
    # Matching exercises take priority — the structure is too different from MCQ.
    for pattern in _MATCHING_CUE_PATTERNS:
        if pattern.search(text):
            return warning_codes.MATCHING_EXERCISE_DETECTED

    if has_image_crops:
        return None

    # Image options: instruction mentions images and we didn't find usable
    # text options.
    image_cued = any(p.search(text) for p in _IMAGE_CUE_PATTERNS)
    if image_cued:
        for question in questions:
            if len(question.options) < 2:
                return warning_codes.IMAGE_OPTION_DETECTED

    return None


def _extract_questions(text: str) -> list[ExtractedQuestion]:
    """Locate every question header and pair it with options that follow."""
    question_matches = list(_QUESTION_HEADER.finditer(text))
    if not question_matches:
        return []

    questions: list[ExtractedQuestion] = []
    for idx, match in enumerate(question_matches):
        start = match.end()
        end = (
            question_matches[idx + 1].start()
            if idx + 1 < len(question_matches)
            else len(text)
        )
        body = text[start:end]

        question_text = match.group(2).strip()
        options: list[str] = []
        for option_match in _OPTION_HEADER.finditer(body):
            options.append(option_match.group(2).strip())

        questions.append(
            ExtractedQuestion(
                number=int(match.group(1)),
                question_text=question_text,
                options=options,
            )
        )
    return questions


def _extract_document_text(text: str, questions: list[ExtractedQuestion]) -> str:
    """Everything before the first question header is treated as the document."""
    first_question_match = _QUESTION_HEADER.search(text)
    if first_question_match is None:
        return ""
    document = text[: first_question_match.start()].strip()
    return document


def _image_options_for_question(
    crops_by_question: dict[int, list[ImageOptionCrop]],
    question_number: int,
) -> list[dict[str, Any]]:
    """Build DelfImageOption-shaped dicts from manifest crops for one question."""
    crops = sorted(
        crops_by_question.get(question_number, []),
        key=lambda c: c.label.lower(),
    )
    return [
        {
            "label": crop.label,
            "img_url": crop.img_url or "",
            "desc": crop.desc or "",
        }
        for crop in crops
    ]


def _group_crops_by_question(
    crops: list[ImageOptionCrop],
) -> dict[int, list[ImageOptionCrop]]:
    grouped: dict[int, list[ImageOptionCrop]] = {}
    for crop in crops:
        grouped.setdefault(crop.question_number, []).append(crop)
    return grouped


def _build_subquestion(
    *,
    exercise_id: str,
    question: ExtractedQuestion,
    crops_by_question: dict[int, list[ImageOptionCrop]] | None = None,
) -> dict[str, Any]:
    image_opts: list[dict[str, Any]] = []
    if crops_by_question:
        image_opts = _image_options_for_question(crops_by_question, question.number)

    body: dict[str, Any] = {
        "id": f"{exercise_id}-q{question.number}",
        "number": question.number,
        "question_text": question.question_text,
        "correct_answer": question.correct_answer,
        "points": question.points,
    }
    if image_opts:
        body["type"] = "multiple_choice_image"
        body["options"] = image_opts
    else:
        body["type"] = "multiple_choice"
        body["options"] = list(question.options)
    return body


def _build_flat_exercise(
    *,
    exercise_id: str,
    title: str,
    document_text: str,
    question: ExtractedQuestion,
    transcript: str | None = None,
    crops_by_question: dict[int, list[ImageOptionCrop]] | None = None,
) -> dict[str, Any]:
    image_opts: list[dict[str, Any]] = []
    if crops_by_question:
        image_opts = _image_options_for_question(crops_by_question, question.number)

    body: dict[str, Any] = {
        "id": exercise_id,
        "title": title,
        "question_text": question.question_text,
        "correct_answer": question.correct_answer,
        "points": question.points,
    }
    if image_opts:
        body["type"] = "multiple_choice_image"
        body["options"] = image_opts
    else:
        body["type"] = "multiple_choice"
        body["options"] = list(question.options)
    if document_text:
        body["document"] = {
            "type": "text",
            "content": document_text,
        }
    if transcript:
        body["transcript"] = transcript
    return body


def _build_nested_exercise(
    *,
    exercise_id: str,
    title: str,
    document_text: str,
    questions: list[ExtractedQuestion],
    transcript: str | None = None,
    crops_by_question: dict[int, list[ImageOptionCrop]] | None = None,
) -> dict[str, Any]:
    body: dict[str, Any] = {
        "id": exercise_id,
        "title": title,
        "type": "reading_comprehension",
        "questions": [
            _build_subquestion(
                exercise_id=exercise_id,
                question=q,
                crops_by_question=crops_by_question,
            )
            for q in questions
        ],
    }
    if document_text:
        body["document"] = {
            "type": "text",
            "content": document_text,
        }
    if transcript:
        body["transcript"] = transcript
    return body


def extract_exercise(
    *,
    activity_number: int,
    title: str,
    activity_text: str,
    answer_key: dict[int, int] | None = None,
    transcript: str | None = None,
    image_option_crops: list[ImageOptionCrop] | None = None,
) -> ExtractionResult:
    """Build a DelfExercise dict from one activity's body text.

    Args:
        activity_number: 1-indexed activity number as labeled in the book.
        title: Activity title (e.g. "Activité 1"). Used as `exercise.title`.
        activity_text: Concatenated text covering this activity's pages,
            with the header line already trimmed off the top.
        answer_key: Optional dict mapping question_number → correct_answer
            index. Comes from the answer PDF.
        transcript: Optional CO transcript text (v3). Attached as
            `DelfExercise.transcript` when present.
        image_option_crops: Optional list of v2 image-option crops keyed by
            (question_number, label). When supplied, options become
            DelfImageOption dicts.

    Returns:
        ExtractionResult. Caller inspects `.exercise` (None if skipped),
        `.skipped`, `.skip_reason`, and `.warnings`.
    """
    exercise_id = f"act-{activity_number}"
    questions = _extract_questions(activity_text)
    crops_by_question = (
        _group_crops_by_question(image_option_crops) if image_option_crops else {}
    )

    skip_reason = _detect_skip_reason(
        activity_text,
        questions,
        has_image_crops=bool(crops_by_question),
    )
    if skip_reason is not None:
        message = {
            warning_codes.IMAGE_OPTION_DETECTED: (
                f"Activity {activity_number} contains image-option questions; "
                "v1 skips these — use the screenshot pipeline manually for now."
            ),
            warning_codes.MATCHING_EXERCISE_DETECTED: (
                f"Activity {activity_number} looks like a matching exercise "
                "(associez/reliez); v1 only supports MCQ."
            ),
        }.get(skip_reason, f"Activity {activity_number} skipped.")
        return ExtractionResult(
            exercise=None,
            questions=questions,
            warnings=[
                warning_codes.make_warning(
                    skip_reason,
                    message,
                    field=f"activity[{activity_number}]",
                )
            ],
            skipped=True,
            skip_reason=skip_reason,
        )

    if not questions:
        # When v2 image crops are present we can fabricate one question per
        # detected option group, so the activity isn't lost just because the
        # PDF text didn't carry "1." prefixes near images.
        if crops_by_question:
            synthesized: list[ExtractedQuestion] = []
            for qnum in sorted(crops_by_question.keys()):
                synthesized.append(
                    ExtractedQuestion(
                        number=qnum,
                        question_text=(
                            f"Question {qnum} — choisissez l'image correspondante."
                        ),
                        options=[],
                    )
                )
            questions = synthesized
        else:
            return ExtractionResult(
                exercise=None,
                questions=[],
                warnings=[
                    warning_codes.make_warning(
                        warning_codes.UNCLASSIFIED_ACTIVITY,
                        f"No questions detected in activity {activity_number}.",
                        field=f"activity[{activity_number}]",
                    )
                ],
                skipped=True,
                skip_reason=warning_codes.UNCLASSIFIED_ACTIVITY,
            )

    # Attach answer key entries, warn for any question without one.
    warnings_out: list[dict[str, Any]] = []
    for question in questions:
        if answer_key is not None and question.number in answer_key:
            question.correct_answer = answer_key[question.number]
        else:
            warnings_out.append(
                warning_codes.make_warning(
                    warning_codes.MISSING_ANSWER_KEY,
                    f"No answer key for activity {activity_number} Q{question.number}.",
                    field=f"activity[{activity_number}].q{question.number}",
                )
            )

    # Always surface the default-points decision so the agent can override.
    warnings_out.append(
        warning_codes.make_warning(
            warning_codes.POINTS_DEFAULTED,
            f"Activity {activity_number}: each question defaulted to "
            f"{DEFAULT_POINTS} point — override before publish if the book "
            "uses a different scheme.",
            field=f"activity[{activity_number}]",
        )
    )

    document_text = _extract_document_text(activity_text, questions)

    if len(questions) == 1:
        exercise = _build_flat_exercise(
            exercise_id=exercise_id,
            title=title,
            document_text=document_text,
            question=questions[0],
            transcript=transcript,
            crops_by_question=crops_by_question or None,
        )
    else:
        exercise = _build_nested_exercise(
            exercise_id=exercise_id,
            title=title,
            document_text=document_text,
            questions=questions,
            transcript=transcript,
            crops_by_question=crops_by_question or None,
        )

    return ExtractionResult(
        exercise=exercise,
        questions=questions,
        warnings=warnings_out,
        skipped=False,
    )


__all__ = [
    "DEFAULT_POINTS",
    "ExtractedQuestion",
    "ExtractionResult",
    "extract_exercise",
]
