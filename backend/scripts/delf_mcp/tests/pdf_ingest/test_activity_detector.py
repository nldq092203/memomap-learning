"""Tests for activity boundary detection and CE/CO classification."""

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

from scripts.delf_mcp.pdf_ingest.activity_detector import (
    detect_activities,
    find_activity_boundaries,
    find_chapter_boundaries,
)
from scripts.delf_mcp.pdf_ingest.pdf_reader import PageContent


def _page(page_number: int, text: str) -> PageContent:
    return PageContent(
        page_number=page_number,
        width=595.0,
        height=842.0,
        text=text,
        blocks=[],
        image_path=None,
    )


def test_finds_simple_activity_headers():
    pages = [_page(1, "Activité 1\n\nLisez le texte.\n\n1. Quelle est ...")]
    boundaries = find_activity_boundaries(pages)
    assert len(boundaries) == 1
    assert boundaries[0].activity_number == 1
    assert boundaries[0].page_number == 1


def test_finds_multiple_activities_in_order():
    pages = [
        _page(1, "Activité 1\n\nQ.\n\nActivité 2\n\nQ."),
        _page(2, "Activité 3\n\nQ."),
    ]
    boundaries = find_activity_boundaries(pages)
    assert [b.activity_number for b in boundaries] == [1, 2, 3]


def test_finds_exercice_synonym():
    pages = [_page(1, "Exercice 5\n\nQuestion.")]
    boundaries = find_activity_boundaries(pages)
    assert len(boundaries) == 1
    assert boundaries[0].activity_number == 5


def test_finds_numbered_listening_prompt_header():
    pages = [
        _page(
            1,
            "Partie B\n"
            "Qù15 1. Écoutez les émissions de radio.\n"
            "1. Question?\n"
            "2 = Vous écoutez la radio.\n",
        )
    ]
    boundaries = find_activity_boundaries(pages)
    assert [b.activity_number for b in boundaries] == [1, 2]


def test_infers_missing_co_activity_number_from_listening_prompt():
    pages = [
        _page(1, "4. Vous écoutez la radio.\nDOCUMENT 1\n1. Question?"),
        _page(2, "GD2 ] « Vous écoutez la radio.\nDOCUMENT 1\n1. Question?"),
        _page(3, "6. Vous écoutez la radio.\nDOCUMENT 1\n1. Question?"),
    ]
    boundaries = find_activity_boundaries(pages)
    assert [b.activity_number for b in boundaries] == [4, 5, 6]
    assert boundaries[1].raw_header == "5. Vous écoutez"


def test_chapter_boundaries():
    pages = [
        _page(1, "Chapitre 1\n\nActivité 1"),
        _page(5, "Chapitre 2\n\nActivité 2"),
    ]
    chapters = find_chapter_boundaries(pages)
    assert [c.chapter_number for c in chapters] == [1, 2]


def test_classifies_ce_with_section_label():
    pages = [
        _page(1, "Activité 1\nCompréhension écrite\nLisez le texte.\n1. ..."),
    ]
    activities = detect_activities(pages)
    assert len(activities) == 1
    assert activities[0].section == "CE"


def test_classifies_co_with_section_label():
    pages = [
        _page(1, "Activité 1\nCompréhension orale\nÉcoutez et répondez."),
    ]
    activities = detect_activities(pages)
    assert activities[0].section == "CO"


def test_classifies_co_via_track_cue_without_label():
    pages = [
        _page(1, "Activité 1\nPiste 12\nÉcoutez l'enregistrement."),
    ]
    activities = detect_activities(pages)
    assert activities[0].section == "CO"


def test_classifies_unknown_when_no_signal():
    pages = [_page(1, "Activité 1\nLisez attentivement.\nQuestion.")]
    activities = detect_activities(pages)
    assert activities[0].section == "UNKNOWN"


def test_multi_page_activity_assembles_text():
    pages = [
        _page(1, "Activité 1\nCompréhension écrite\nDébut du texte."),
        _page(2, "Suite du texte.\n1. Question 1"),
        _page(3, "Activité 2\nCompréhension écrite\nAutre exercice."),
    ]
    activities = detect_activities(pages)
    assert len(activities) == 2
    assert activities[0].page_start == 1
    assert activities[0].page_end == 2
    assert "Suite du texte" in activities[0].text
    assert "Autre exercice" not in activities[0].text
    assert activities[1].page_start == 3


def test_chapter_grouping():
    pages = [
        _page(1, "Chapitre 1\nActivité 1\nCompréhension écrite"),
        _page(2, "Activité 2\nCompréhension écrite"),
        _page(3, "Chapitre 2\nActivité 3\nCompréhension écrite"),
    ]
    activities = detect_activities(pages)
    chapters = [a.chapter_number for a in activities]
    assert chapters == [1, 1, 2]


def test_empty_pages_yield_no_activities():
    assert detect_activities([]) == []
    assert detect_activities([_page(1, "")]) == []
