"""Tests for answer key parsing from a transcript/answer PDF."""

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

from scripts.delf_mcp.pdf_ingest.answer_parser import parse_answer_pdf
from scripts.delf_mcp.pdf_ingest.pdf_reader import PageContent


def _page(text: str) -> PageContent:
    return PageContent(
        page_number=1,
        width=595.0,
        height=842.0,
        text=text,
        blocks=[],
        image_path=None,
    )


def test_parses_dotted_form():
    text = (
        "Corrigés\n\n"
        "Activité 1\n"
        "1. b   2. a   3. c\n\n"
        "Activité 2\n"
        "1. c   2. b\n"
    )
    key = parse_answer_pdf([_page(text)])
    assert key.for_activity(1) == {1: 1, 2: 0, 3: 2}
    assert key.for_activity(2) == {1: 2, 2: 1}


def test_parses_dashed_form():
    text = "Activité 5 : 1-b, 2-a, 3-c"
    key = parse_answer_pdf([_page(text)])
    assert key.for_activity(5) == {1: 1, 2: 0, 3: 2}


def test_parses_one_per_line_form():
    text = "Activité 3\n" "1. a\n" "2. d\n" "3. b\n"
    key = parse_answer_pdf([_page(text)])
    assert key.for_activity(3) == {1: 0, 2: 3, 3: 1}


def test_unknown_activity_returns_none():
    text = "Activité 1\n1. a\n"
    key = parse_answer_pdf([_page(text)])
    assert key.for_activity(99) is None


def test_no_activity_headers_yields_empty_key():
    key = parse_answer_pdf([_page("Just some prose without answer markers.")])
    assert key.answers == {}


def test_letter_to_index_handles_uppercase():
    text = "Activité 7\n1. B\n2. C\n"
    key = parse_answer_pdf([_page(text)])
    assert key.for_activity(7) == {1: 1, 2: 2}
