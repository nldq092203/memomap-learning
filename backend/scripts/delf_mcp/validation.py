"""DelfTestPaper validation: Pydantic schema + DELF business rules.

This module is pure logic — no DB, no network. Safe to import standalone.
"""

from __future__ import annotations

import json
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
            errors.append({
                "field": f"exercises[{idx}].id",
                "message": (
                    f"Duplicate exercise id '{exercise.id}' "
                    f"(also at exercises[{seen[exercise.id]}])"
                ),
                "type": "value_error",
            })
        else:
            seen[exercise.id] = idx
    return errors


def _check_duplicate_subquestion_ids(paper: DelfTestPaper) -> list[dict[str, str]]:
    errors: list[dict[str, str]] = []
    for ex_idx, exercise in enumerate(paper.exercises):
        seen: dict[str, int] = {}
        for q_idx, question in enumerate(exercise.questions):
            if question.id in seen:
                errors.append({
                    "field": f"exercises[{ex_idx}].questions[{q_idx}].id",
                    "message": (
                        f"Duplicate sub-question id '{question.id}' "
                        f"within exercise '{exercise.id}' "
                        f"(also at questions[{seen[question.id]}])"
                    ),
                    "type": "value_error",
                })
            else:
                seen[question.id] = q_idx
    return errors


def _check_correct_answer_bounds(paper: DelfTestPaper) -> list[dict[str, str]]:
    errors: list[dict[str, str]] = []
    for ex_idx, exercise in enumerate(paper.exercises):
        # Flat MCQ
        if exercise.options and exercise.correct_answer is not None:
            if not (0 <= exercise.correct_answer < len(exercise.options)):
                errors.append({
                    "field": f"exercises[{ex_idx}].correct_answer",
                    "message": (
                        f"correct_answer={exercise.correct_answer} is out of bounds "
                        f"for options (size {len(exercise.options)})"
                    ),
                    "type": "value_error",
                })
        # Nested questions
        for q_idx, question in enumerate(exercise.questions):
            if question.options and question.correct_answer is not None:
                if not (0 <= question.correct_answer < len(question.options)):
                    errors.append({
                        "field": (
                            f"exercises[{ex_idx}].questions[{q_idx}].correct_answer"
                        ),
                        "message": (
                            f"correct_answer={question.correct_answer} is out of "
                            f"bounds for options (size {len(question.options)})"
                        ),
                        "type": "value_error",
                    })
    return errors


def _check_ce_audio(paper: DelfTestPaper) -> list[dict[str, str]]:
    if paper.section.upper() != "CE":
        return []
    audio = paper.audio_filename
    if audio is None or audio == "":
        return []
    return [{
        "field": "audio_filename",
        "message": (
            f"CE (reading comprehension) papers must not have audio_filename, "
            f"got '{audio}'"
        ),
        "type": "value_error",
    }]


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
            errors.append({
                "field": f"exercises[{ex_idx}].{field_name}",
                "message": (
                    f"Exercise '{exercise.id}' uses nested questions; "
                    f"flat MCQ field '{field_name}' must be empty/null"
                ),
                "type": "value_error",
            })
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

    biz_errors = _business_errors(paper)
    if biz_errors:
        return {
            "valid": False,
            "errors": biz_errors,
            "error_count": len(biz_errors),
        }

    return {
        "valid": True,
        "message": "Content is valid",
        "summary": _summary(paper),
        "paper": paper,
    }


def validate_content_for_tool(content: Any) -> dict[str, Any]:
    """Public-facing variant: strips the internal `paper` object from the result."""
    result = validate_content(content)
    result.pop("paper", None)
    return result


__all__ = ["validate_content", "validate_content_for_tool"]
