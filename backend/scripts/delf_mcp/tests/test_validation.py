"""Tests for scripts.delf_mcp.validation.

Pure-logic tests — no DB, no GitHub, no network. Run from `backend/`:

    uv run python -m pytest scripts/delf_mcp/tests
"""

from __future__ import annotations

import json
import os
import sys

# Allow running pytest directly from the `backend/` directory.
_BACKEND_DIR = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from scripts.delf_mcp.tests import fixtures  # noqa: E402
from scripts.delf_mcp.validation import (  # noqa: E402
    validate_content,
    validate_content_for_tool,
)


def _errors_for_field(result, field_prefix: str):
    return [e for e in result["errors"] if e["field"].startswith(field_prefix)]


# ---------------------------------------------------------------------------
# Happy paths
# ---------------------------------------------------------------------------


def test_valid_ce_paper_dict_passes():
    result = validate_content(fixtures.VALID_CE_PAPER)
    assert result["valid"] is True
    assert result["summary"]["test_id"] == "tp-01"
    assert result["summary"]["section"] == "CE"
    assert result["summary"]["exercise_count"] == 2
    # ex-1 = 1 flat question; ex-2 = 2 nested questions
    assert result["summary"]["total_questions"] == 3


def test_valid_ce_paper_json_string_passes():
    payload = json.dumps(fixtures.VALID_CE_PAPER)
    result = validate_content(payload)
    assert result["valid"] is True
    assert result["summary"]["test_id"] == "tp-01"


# ---------------------------------------------------------------------------
# Pydantic errors
# ---------------------------------------------------------------------------


def test_missing_required_field_returns_pydantic_error():
    result = validate_content(fixtures.paper_missing_required_field())
    assert result["valid"] is False
    assert result["error_count"] >= 1
    fields = [e["field"] for e in result["errors"]]
    assert "test_id" in fields


def test_malformed_json_string_returns_decode_error():
    result = validate_content("{not valid json")
    assert result["valid"] is False
    assert result["error_count"] == 1
    assert result["errors"][0]["type"] == "json_decode_error"
    assert result["errors"][0]["field"] == "content"


def test_non_object_json_returns_type_error():
    result = validate_content("[1, 2, 3]")
    assert result["valid"] is False
    assert result["errors"][0]["type"] == "type_error"


def test_unsupported_content_type_returns_error():
    result = validate_content(12345)
    assert result["valid"] is False
    assert result["errors"][0]["type"] == "type_error"


# ---------------------------------------------------------------------------
# Business rules
# ---------------------------------------------------------------------------


def test_duplicate_exercise_id_is_caught():
    result = validate_content(fixtures.paper_duplicate_exercise_id())
    assert result["valid"] is False
    errs = _errors_for_field(result, "exercises[1].id")
    assert errs, "expected error on exercises[1].id"
    assert "Duplicate exercise id" in errs[0]["message"]


def test_duplicate_subquestion_id_is_caught():
    result = validate_content(fixtures.paper_duplicate_subquestion_id())
    assert result["valid"] is False
    errs = _errors_for_field(result, "exercises[1].questions[1].id")
    assert errs
    assert "Duplicate sub-question id" in errs[0]["message"]


def test_correct_answer_out_of_range_flat():
    result = validate_content(fixtures.paper_correct_answer_out_of_range_flat())
    assert result["valid"] is False
    errs = _errors_for_field(result, "exercises[0].correct_answer")
    assert errs
    assert "out of bounds" in errs[0]["message"]


def test_correct_answer_out_of_range_nested():
    result = validate_content(fixtures.paper_correct_answer_out_of_range_nested())
    assert result["valid"] is False
    errs = _errors_for_field(
        result, "exercises[1].questions[0].correct_answer"
    )
    assert errs


def test_ce_with_audio_filename_fails():
    result = validate_content(fixtures.paper_ce_with_audio())
    assert result["valid"] is False
    errs = _errors_for_field(result, "audio_filename")
    assert errs
    assert "CE" in errs[0]["message"]


def test_nested_plus_flat_mcq_is_rejected():
    result = validate_content(fixtures.paper_nested_plus_flat_mcq())
    assert result["valid"] is False
    fields = [e["field"] for e in result["errors"]]
    assert "exercises[1].options" in fields
    assert "exercises[1].correct_answer" in fields


# ---------------------------------------------------------------------------
# French text quality warnings
# ---------------------------------------------------------------------------


def test_unaccented_french_text_returns_quality_warning():
    result = validate_content(fixtures.VALID_CE_PAPER)
    assert result["valid"] is True
    assert result["quality_warning_count"] >= 1
    assert any(
        warning["field"] == "exercises[0].question_text"
        and warning["suggestion"] == "r\u00e9ponse"
        for warning in result["quality_warnings"]
    )


def test_accented_french_text_has_no_warning_for_that_phrase():
    payload = fixtures.clone(fixtures.VALID_CE_PAPER)
    payload["exercises"][0]["question_text"] = (
        "Lisez le texte et choisissez la bonne r\u00e9ponse."
    )

    result = validate_content(payload)

    assert not any(
        warning["field"] == "exercises[0].question_text"
        and warning["suggestion"] == "r\u00e9ponse"
        for warning in result["quality_warnings"]
    )


def test_validate_content_for_tool_exposes_quality_warnings_without_model():
    result = validate_content_for_tool(fixtures.VALID_CE_PAPER)
    assert "paper" not in result
    assert "quality_warnings" in result
    assert "quality_warning_count" in result


# ---------------------------------------------------------------------------
# Error shape contract
# ---------------------------------------------------------------------------


def test_all_errors_have_field_message_type():
    result = validate_content(fixtures.paper_duplicate_exercise_id())
    assert result["valid"] is False
    for err in result["errors"]:
        assert set(err.keys()) >= {"field", "message", "type"}
        assert isinstance(err["field"], str)
        assert isinstance(err["message"], str)
        assert isinstance(err["type"], str)
