"""DelfTestPaper validation: Pydantic schema + DELF business rules.

This module is pure logic — no DB, no network. Safe to import standalone.
"""

from __future__ import annotations

import json
import re
from typing import Any

from pydantic import ValidationError

from src.shared.delf_practice.schemas import DelfExercise, DelfTestPaper

# Flat MCQ fields that must NOT be populated on an exercise that also has
# nested `questions`. Each entry is (attribute, "empty" sentinel value).
_FLAT_MCQ_FIELDS: tuple[tuple[str, Any], ...] = (
    ("options", []),
    ("correct_answer", None),
    ("correct_answers", None),
    ("points", None),
    ("transcript", None),
)

_FRENCH_ACCENT_PATTERNS: tuple[tuple[re.Pattern[str], str, str], ...] = (
    (
        re.compile(r"\bfrancais\b", re.IGNORECASE),
        "fran\u00e7ais",
        "Missing cedilla in French adjective",
    ),
    (
        re.compile(r"\brepondre\b", re.IGNORECASE),
        "r\u00e9pondre",
        "Missing acute accent",
    ),
    (
        re.compile(r"\breponse\b", re.IGNORECASE),
        "r\u00e9ponse",
        "Missing acute accent",
    ),
    (
        re.compile(r"\bNadege\b"),
        "Nad\u00e8ge",
        "Missing grave accent in proper name",
    ),
    (
        re.compile(r"\bdecid(?:e|es|ee|ees)\b", re.IGNORECASE),
        "d\u00e9cid\u00e9",
        "Missing acute accents",
    ),
    (
        re.compile(r"\bregion\b", re.IGNORECASE),
        "r\u00e9gion",
        "Missing acute accent",
    ),
    (re.compile(r"Rhone", re.IGNORECASE), "Rh\u00f4ne", "Missing circumflex"),
    (
        re.compile(r"\bepicerie\b", re.IGNORECASE),
        "\u00e9picerie",
        "Missing acute accent",
    ),
    (
        re.compile(r"\blegumes\b", re.IGNORECASE),
        "l\u00e9gumes",
        "Missing acute accent",
    ),
    (
        re.compile(r"\becole\b", re.IGNORECASE),
        "\u00e9cole",
        "Missing acute accent",
    ),
    (
        re.compile(r"\bprobleme\b", re.IGNORECASE),
        "probl\u00e8me",
        "Missing grave accent",
    ),
    (
        re.compile(r"\bactivites\b", re.IGNORECASE),
        "activit\u00e9s",
        "Missing acute accent",
    ),
    (
        re.compile(r"\bexterieur\b", re.IGNORECASE),
        "ext\u00e9rieur",
        "Missing acute accent",
    ),
    (
        re.compile(r"\breussir\b", re.IGNORECASE),
        "r\u00e9ussir",
        "Missing acute accent",
    ),
    (
        re.compile(r"\bdemenagent\b", re.IGNORECASE),
        "d\u00e9m\u00e9nagent",
        "Missing acute accents",
    ),
    (
        re.compile(r"\bou\s+\?", re.IGNORECASE),
        "o\u00f9 ?",
        "Likely missing grave accent in question word",
    ),
    (re.compile(r"\bA\s+l'"), "\u00c0 l'", "Missing grave accent on preposition"),
    (
        re.compile(
            r"\ba\s+(la|le|l'|cote|c\u00f4t\u00e9|campagne|Sancy)\b",
            re.IGNORECASE,
        ),
        "\u00e0 ...",
        "Likely missing grave accent on preposition",
    ),
)


def _format_field_path(loc: tuple[Any, ...]) -> str:
    """Render a Pydantic `loc` tuple as `exercises[0].questions[1].id`."""
    parts: list[str] = []
    for item in loc:
        if isinstance(item, int):
            if parts:
                parts[-1] = f"{parts[-1]}[{item}]"
            else:
                parts.append(f"[{item}]")
        else:
            parts.append(str(item))
    return ".".join(parts)


def _pydantic_errors(exc: ValidationError) -> list[dict[str, str]]:
    return [
        {
            "field": _format_field_path(err["loc"]),
            "message": err.get("msg", "Invalid value"),
            "type": err.get("type", "value_error"),
        }
        for err in exc.errors()
    ]


def _quality_warning(
    *,
    field: str,
    text: str,
    suggestion: str,
    reason: str,
) -> dict[str, str]:
    snippet = text.strip().replace("\n", " ")
    if len(snippet) > 120:
        snippet = f"{snippet[:117]}..."
    return {
        "field": field,
        "message": f'{reason}. Check: "{snippet}"',
        "type": "french_text_quality_warning",
        "suggestion": suggestion,
    }


def _check_text_quality(field: str, text: str | None) -> list[dict[str, str]]:
    if not text:
        return []

    warnings: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for pattern, suggestion, reason in _FRENCH_ACCENT_PATTERNS:
        if not pattern.search(text):
            continue
        key = (field, suggestion)
        if key in seen:
            continue
        seen.add(key)
        warnings.append(
            _quality_warning(
                field=field,
                text=text,
                suggestion=suggestion,
                reason=reason,
            )
        )
    return warnings


def _collect_quality_warnings(paper: DelfTestPaper) -> list[dict[str, str]]:
    warnings: list[dict[str, str]] = []

    for ex_idx, exercise in enumerate(paper.exercises):
        ex_path = f"exercises[{ex_idx}]"
        warnings.extend(_check_text_quality(f"{ex_path}.title", exercise.title))
        warnings.extend(
            _check_text_quality(f"{ex_path}.question_text", exercise.question_text)
        )
        warnings.extend(
            _check_text_quality(f"{ex_path}.instruction", exercise.instruction)
        )
        warnings.extend(
            _check_text_quality(f"{ex_path}.transcript", exercise.transcript)
        )
        warnings.extend(
            _check_text_quality(f"{ex_path}.explanation", exercise.explanation)
        )

        if exercise.document:
            doc_path = f"{ex_path}.document"
            warnings.extend(
                _check_text_quality(f"{doc_path}.title", exercise.document.title)
            )
            warnings.extend(
                _check_text_quality(f"{doc_path}.content", exercise.document.content)
            )
            warnings.extend(
                _check_text_quality(f"{doc_path}.sender", exercise.document.sender)
            )
            warnings.extend(
                _check_text_quality(f"{doc_path}.subject", exercise.document.subject)
            )
            warnings.extend(
                _check_text_quality(f"{doc_path}.body", exercise.document.body)
            )
            for part_idx, part in enumerate(exercise.document.parts):
                part_path = f"{doc_path}.parts[{part_idx}]"
                warnings.extend(
                    _check_text_quality(f"{part_path}.excerpt", part.excerpt)
                )

        for opt_idx, option in enumerate(exercise.options):
            if isinstance(option, str):
                warnings.extend(
                    _check_text_quality(f"{ex_path}.options[{opt_idx}]", option)
                )
            else:
                warnings.extend(
                    _check_text_quality(
                        f"{ex_path}.options[{opt_idx}].desc",
                        option.desc,
                    )
                )

        for doc_idx, doc in enumerate(exercise.documents):
            doc_path = f"{ex_path}.documents[{doc_idx}]"
            warnings.extend(_check_text_quality(f"{doc_path}.title", doc.title))
            warnings.extend(_check_text_quality(f"{doc_path}.content", doc.content))

        for person_idx, person in enumerate(exercise.persons):
            person_path = f"{ex_path}.persons[{person_idx}]"
            warnings.extend(
                _check_text_quality(f"{person_path}.description", person.description)
            )

        for q_idx, question in enumerate(exercise.questions):
            q_path = f"{ex_path}.questions[{q_idx}]"
            warnings.extend(
                _check_text_quality(f"{q_path}.question_text", question.question_text)
            )
            warnings.extend(
                _check_text_quality(f"{q_path}.explanation", question.explanation)
            )
            for opt_idx, option in enumerate(question.options):
                if isinstance(option, str):
                    warnings.extend(
                        _check_text_quality(f"{q_path}.options[{opt_idx}]", option)
                    )
                else:
                    warnings.extend(
                        _check_text_quality(
                            f"{q_path}.options[{opt_idx}].desc", option.desc
                        )
                    )
            for label_idx, label in enumerate(question.labels):
                warnings.extend(
                    _check_text_quality(
                        f"{q_path}.labels[{label_idx}].description",
                        label.description,
                    )
                )

    return warnings


def _parse_content(content: Any) -> tuple[dict | None, dict | None]:
    """Coerce input to a dict. Returns (parsed_dict, error)."""
    if isinstance(content, dict):
        return content, None
    if isinstance(content, str):
        try:
            data = json.loads(content)
        except json.JSONDecodeError as exc:
            return None, {
                "field": "content",
                "message": f"Invalid JSON string: {exc.msg} (line {exc.lineno}, col {exc.colno})",
                "type": "json_decode_error",
            }
        if not isinstance(data, dict):
            return None, {
                "field": "content",
                "message": "JSON must decode to an object",
                "type": "type_error",
            }
        return data, None
    return None, {
        "field": "content",
        "message": "content must be a JSON object or JSON string",
        "type": "type_error",
    }


def _check_duplicate_exercise_ids(paper: DelfTestPaper) -> list[dict[str, str]]:
    errors: list[dict[str, str]] = []
    seen: dict[str, int] = {}
    for idx, exercise in enumerate(paper.exercises):
        if exercise.id in seen:
            errors.append(
                {
                    "field": f"exercises[{idx}].id",
                    "message": (
                        f"Duplicate exercise id '{exercise.id}' "
                        f"(also at exercises[{seen[exercise.id]}])"
                    ),
                    "type": "value_error",
                }
            )
        else:
            seen[exercise.id] = idx
    return errors


def _check_duplicate_subquestion_ids(paper: DelfTestPaper) -> list[dict[str, str]]:
    errors: list[dict[str, str]] = []
    for ex_idx, exercise in enumerate(paper.exercises):
        seen: dict[str, int] = {}
        for q_idx, question in enumerate(exercise.questions):
            if question.id in seen:
                errors.append(
                    {
                        "field": f"exercises[{ex_idx}].questions[{q_idx}].id",
                        "message": (
                            f"Duplicate sub-question id '{question.id}' "
                            f"within exercise '{exercise.id}' "
                            f"(also at questions[{seen[question.id]}])"
                        ),
                        "type": "value_error",
                    }
                )
            else:
                seen[question.id] = q_idx
    return errors


def _check_correct_answer_bounds(paper: DelfTestPaper) -> list[dict[str, str]]:
    errors: list[dict[str, str]] = []
    for ex_idx, exercise in enumerate(paper.exercises):
        # Flat MCQ
        if exercise.options and exercise.correct_answer is not None:
            if not (0 <= exercise.correct_answer < len(exercise.options)):
                errors.append(
                    {
                        "field": f"exercises[{ex_idx}].correct_answer",
                        "message": (
                            f"correct_answer={exercise.correct_answer} is out of bounds "
                            f"for options (size {len(exercise.options)})"
                        ),
                        "type": "value_error",
                    }
                )
        # Nested questions
        for q_idx, question in enumerate(exercise.questions):
            if question.options and question.correct_answer is not None:
                if not (0 <= question.correct_answer < len(question.options)):
                    errors.append(
                        {
                            "field": (
                                f"exercises[{ex_idx}].questions[{q_idx}].correct_answer"
                            ),
                            "message": (
                                f"correct_answer={question.correct_answer} is out of "
                                f"bounds for options (size {len(question.options)})"
                            ),
                            "type": "value_error",
                        }
                    )
    return errors


def _check_ce_audio(paper: DelfTestPaper) -> list[dict[str, str]]:
    if paper.section.upper() != "CE":
        return []
    audio_values = []
    if paper.audio_filename:
        audio_values.append(paper.audio_filename)
    audio_values.extend(value for value in paper.audio_filenames if value)
    if not audio_values:
        return []
    return [
        {
            "field": "audio_filename",
            "message": (
                "CE (reading comprehension) papers must not have audio files, "
                f"got {audio_values}"
            ),
            "type": "value_error",
        }
    ]


def _exercise_has_flat_mcq(exercise: DelfExercise) -> list[str]:
    """Return names of flat MCQ fields populated on this exercise."""
    populated: list[str] = []
    for field_name, empty in _FLAT_MCQ_FIELDS:
        value = getattr(exercise, field_name)
        if value != empty:
            populated.append(field_name)
    return populated


def _check_nested_vs_flat(paper: DelfTestPaper) -> list[dict[str, str]]:
    errors: list[dict[str, str]] = []
    for ex_idx, exercise in enumerate(paper.exercises):
        if not exercise.questions:
            continue
        conflicts = _exercise_has_flat_mcq(exercise)
        for field_name in conflicts:
            errors.append(
                {
                    "field": f"exercises[{ex_idx}].{field_name}",
                    "message": (
                        f"Exercise '{exercise.id}' uses nested questions; "
                        f"flat MCQ field '{field_name}' must be empty/null"
                    ),
                    "type": "value_error",
                }
            )
    return errors


def _business_errors(paper: DelfTestPaper) -> list[dict[str, str]]:
    errors: list[dict[str, str]] = []
    errors.extend(_check_duplicate_exercise_ids(paper))
    errors.extend(_check_duplicate_subquestion_ids(paper))
    errors.extend(_check_correct_answer_bounds(paper))
    errors.extend(_check_ce_audio(paper))
    errors.extend(_check_nested_vs_flat(paper))
    return errors


def _summary(paper: DelfTestPaper) -> dict[str, Any]:
    total_questions = 0
    for exercise in paper.exercises:
        if exercise.questions:
            total_questions += len(exercise.questions)
        else:
            total_questions += 1
    return {
        "test_id": paper.test_id,
        "section": paper.section,
        "exercise_count": len(paper.exercises),
        "total_questions": total_questions,
    }


def validate_content(content: Any) -> dict[str, Any]:
    """Validate a DelfTestPaper payload (dict or JSON string).

    Returns a dict shaped per the MCP tool contract:
    - {valid: True, message, summary, paper} on success
    - {valid: False, errors, error_count} on failure
    """
    parsed, parse_err = _parse_content(content)
    if parse_err is not None:
        return {"valid": False, "errors": [parse_err], "error_count": 1}

    try:
        paper = DelfTestPaper.model_validate(parsed)
    except ValidationError as exc:
        errs = _pydantic_errors(exc)
        return {"valid": False, "errors": errs, "error_count": len(errs)}

    quality_warnings = _collect_quality_warnings(paper)
    quality_fields = {
        "quality_warnings": quality_warnings,
        "quality_warning_count": len(quality_warnings),
    }

    biz_errors = _business_errors(paper)
    if biz_errors:
        return {
            "valid": False,
            "errors": biz_errors,
            "error_count": len(biz_errors),
            **quality_fields,
        }

    return {
        "valid": True,
        "message": "Content is valid",
        "summary": _summary(paper),
        "paper": paper,
        **quality_fields,
    }


def validate_content_for_tool(content: Any) -> dict[str, Any]:
    """Public-facing variant: strips the internal `paper` object from the result."""
    result = validate_content(content)
    result.pop("paper", None)
    return result


__all__ = ["validate_content", "validate_content_for_tool"]
