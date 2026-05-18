"""Edge-case tests for naming_service that complement test_naming_service.py.

Covers slugged conventions, gaps, width edge cases, and `build_github_directory`.
No DB or network — uses in-memory fakes.
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass

_BACKEND_DIR = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from scripts.delf_mcp.naming_service import (  # noqa: E402
    build_github_directory,
    suggest_delf_test_id,
    suggest_test_id_from_existing,
)


# ---------------------------------------------------------------------------
# build_github_directory
# ---------------------------------------------------------------------------


def test_build_github_directory_lowercases_level():
    assert (
        build_github_directory("A2", "tout-public-a2", "CE")
        == "delf/a2/tout-public-a2/CE/tp"
    )


def test_build_github_directory_preserves_variant_and_section():
    assert (
        build_github_directory("b1", "ecole-b1", "CO")
        == "delf/b1/ecole-b1/CO/tp"
    )


# ---------------------------------------------------------------------------
# suggest_test_id_from_existing — edge cases not covered elsewhere
# ---------------------------------------------------------------------------


def test_empty_corpus_defaults_to_tp_01():
    suggested, convention = suggest_test_id_from_existing(set())
    assert suggested == "tp-01"
    assert convention == "tp-XX"


def test_corpus_with_gap_does_not_fill():
    # Deliberate behaviour: we pick max+1 rather than filling holes
    suggested, _ = suggest_test_id_from_existing({"tp-01", "tp-03"})
    assert suggested == "tp-04"


def test_collision_walks_forward():
    suggested, _ = suggest_test_id_from_existing({"tp-01", "tp-02", "tp-03"})
    assert suggested == "tp-04"


def test_slugged_corpus_proposes_slugged_id_when_title_supplied():
    existing = {"tp-01-cafe", "tp-02-restaurant"}
    suggested, convention = suggest_test_id_from_existing(
        existing, title="Visite du musée"
    )
    assert suggested.startswith("tp-03-")
    assert "visite" in suggested
    assert convention == "tp-XX-title"


def test_slugged_corpus_falls_back_to_canonical_without_title():
    suggested, convention = suggest_test_id_from_existing(
        {"tp-01-cafe", "tp-02-resto"}, title=None
    )
    assert suggested == "tp-03"
    assert convention == "tp-XX"


# ---------------------------------------------------------------------------
# suggest_delf_test_id — output contract
# ---------------------------------------------------------------------------


@dataclass
class _Record:
    id: str
    test_id: str
    status: str
    github_path: str


class _Repo:
    def __init__(self, records):
        self.records = records

    def list_by_scope(self, level, variant, section, status=None):
        return self.records


class _Github:
    def __init__(self, ids):
        self.ids = ids

    def list_json_stems(self, directory_path):
        return self.ids


def test_suggest_delf_test_id_uppercases_level_in_response():
    result = suggest_delf_test_id(
        level="a2",
        variant="tout-public-a2",
        section="CE",
        repo=_Repo([]),
        github=_Github([]),
    )
    assert result["success"] is True
    assert result["level"] == "A2"
    assert result["suggested_test_id"] == "tp-01"


def test_suggest_delf_test_id_exposes_corpus_arrays():
    result = suggest_delf_test_id(
        level="A2",
        variant="v",
        section="CE",
        repo=_Repo([_Record("u1", "tp-01", "active", "delf/a2/v/CE/tp/tp-01.json")]),
        github=_Github(["tp-02"]),
    )
    assert set(result["db_existing_test_ids"]) == {"tp-01"}
    assert set(result["github_existing_test_ids"]) == {"tp-02"}
    assert set(result["all_existing_test_ids"]) == {"tp-01", "tp-02"}
    assert result["suggested_test_id"] == "tp-03"
