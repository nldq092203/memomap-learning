"""Tests for transcript parsing (v3 CO support)."""

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

from scripts.delf_mcp.pdf_ingest.pdf_reader import PageContent
from scripts.delf_mcp.pdf_ingest.transcript_parser import parse_transcript_pdf


def _page(text: str) -> PageContent:
    return PageContent(
        page_number=1,
        width=595.0,
        height=842.0,
        text=text,
        blocks=[],
        image_path=None,
    )


def test_parses_main_transcripts_after_section_header():
    text = (
        "Corrigés\n\n"
        "Activité 1\n1. b   2. a\n\n"  # answer key, not transcript
        "Transcriptions\n\n"
        "Activité 1\n"
        "Bonjour, je m'appelle Pierre et je travaille à Paris.\n\n"
        "Activité 2\n"
        "Voici le dialogue d'aujourd'hui.\n"
    )
    out = parse_transcript_pdf([_page(text)])
    assert "Pierre" in out.for_activity(1)
    assert "dialogue" in out.for_activity(2)
    # Answer key block for activity 1 (`1. b 2. a`) is short prose and gets
    # filtered out; only the post-`Transcriptions` block survives.
    assert "1. b" not in out.for_activity(1)


def test_extracts_extra_transcripts_for_document_blocks():
    text = (
        "Transcriptions\n\n"
        "Activité 5\n"
        "Document 1\nAnnonce dans le métro: prochain arrêt République.\n"
        "Document 2\nMessage de répondeur: bonjour, c'est Marie.\n"
    )
    out = parse_transcript_pdf([_page(text)])
    extras = out.extras_for_activity(5)
    assert len(extras) == 2
    assert extras[0]["id"] == "act-5-doc-1"
    assert "métro" in extras[0]["content"]
    assert extras[1]["id"] == "act-5-doc-2"


def test_activity_without_transcript_returns_none():
    text = "Transcriptions\n\nActivité 1\nBonjour.\n"
    out = parse_transcript_pdf([_page(text)])
    assert out.for_activity(2) is None


def test_handles_no_transcripts_section_gracefully():
    text = "Activité 1\nBonjour, voici un texte assez long pour passer le seuil.\n"
    out = parse_transcript_pdf([_page(text)])
    # Without the scope marker, we still parse activity blocks.
    assert "Bonjour" in (out.for_activity(1) or "")


def test_empty_input_yields_empty_transcripts():
    out = parse_transcript_pdf([_page("")])
    assert out.main == {}
    assert out.extras == {}


def test_duplicate_activity_keeps_first_and_warns():
    text = (
        "Transcriptions\n\n"
        "Activité 1\nPremier transcript détaillé pour activité 1.\n\n"
        "Activité 1\nDeuxième transcript pour activité 1.\n"
    )
    out = parse_transcript_pdf([_page(text)])
    assert "Premier" in out.for_activity(1)
    assert any(w["code"] == "ambiguous_transcript" for w in out.warnings)
