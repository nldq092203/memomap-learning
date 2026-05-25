"""Detect activity boundaries in a DELF book PDF and classify CE vs CO.

Activities are detected by header patterns common to DELF prep books:
- "Activité 1", "Activité 2", ...
- "Exercice 1", "Exercice 2", ...
- Numbered headings like "1." or "1)" at the start of a line.

CE vs CO is classified by looking for explicit section labels first
("Compréhension écrite" / "Compréhension orale" / "Compréhension de l'écrit"
/ "Compréhension de l'oral"), then by listening cues (Piste/Track markers)
which only appear in CO activities.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

from .pdf_reader import PageContent


# Activity-header patterns. A line matching any of these starts a new
# activity boundary. The capture group returns the activity number string.
_ACTIVITY_HEADER_PATTERNS: tuple[re.Pattern[str], ...] = (
    # "Activité 1", "ACTIVITÉ 1", "Activite 1" (with or without accent)
    re.compile(r"^\s*activit[ée]\s+(\d{1,3})\b", re.IGNORECASE | re.MULTILINE),
    # "Exercice 1", "EXERCICE 1"
    re.compile(r"^\s*exercice\s+(\d{1,3})\b", re.IGNORECASE | re.MULTILINE),
    # CO prep-book pages often use only a numbered listening prompt:
    # "1. Écoutez les émissions..." or OCR variants like "2 = Vous écoutez..."
    re.compile(
        r"(?:^|\s)(\d{1,3})\s*[\.\-=]\s*(?:vous\s+)?[ée]coutez\b",
        re.IGNORECASE | re.MULTILINE,
    ),
)

# Chapter / unit header. Used to group activities by chapter so that
# CE+CO activities from one chapter become two papers (one per section).
_CHAPTER_HEADER_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"^\s*chapitre\s+(\d{1,3})\b", re.IGNORECASE | re.MULTILINE),
    re.compile(r"^\s*unit[ée]\s+(\d{1,3})\b", re.IGNORECASE | re.MULTILINE),
    re.compile(r"^\s*le[çc]on\s+(\d{1,3})\b", re.IGNORECASE | re.MULTILINE),
)

# Explicit section markers. These are strong signals.
_CE_SECTION_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(
        r"compr[ée]hension\s+(?:de\s+l['’]\s*)?[ée]crit[e]?",
        re.IGNORECASE,
    ),
)
_CO_SECTION_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(
        r"compr[ée]hension\s+(?:de\s+l['’]\s*)?oral[e]?",
        re.IGNORECASE,
    ),
)

# Audio/track cues — only appear in CO activities.
_TRACK_CUE_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"\bpiste\s+\d+\b", re.IGNORECASE),
    re.compile(r"\btrack\s+\d+\b", re.IGNORECASE),
    re.compile(r"\bcd\s*\d+\s*[-–]\s*\d+\b", re.IGNORECASE),
    re.compile(r"écouter|écoutez", re.IGNORECASE),
)


@dataclass(frozen=True)
class ActivityBoundary:
    """An activity header detected somewhere in the PDF."""

    activity_number: int
    page_number: int  # 1-indexed; where the header appears
    char_offset: int  # offset within that page's text
    raw_header: str  # captured header text e.g. "Activité 1"


@dataclass(frozen=True)
class ChapterBoundary:
    """A chapter header (used as a grouping marker)."""

    chapter_number: int
    page_number: int


@dataclass(frozen=True)
class ClassifiedActivity:
    """Activity with its assembled text and section classification."""

    activity_number: int
    section: str  # "CE", "CO", or "UNKNOWN"
    chapter_number: int | None
    title: str
    page_start: int
    page_end: int
    text: str


def _normalize_for_match(text: str) -> str:
    """Lower-case + strip accents for tolerant matching."""
    decomposed = unicodedata.normalize("NFD", text)
    stripped = "".join(c for c in decomposed if not unicodedata.combining(c))
    return stripped.lower()


def find_activity_boundaries(
    pages: list[PageContent],
) -> list[ActivityBoundary]:
    """Scan every page for activity headers and return them in document order."""
    boundaries: list[ActivityBoundary] = []
    for page in pages:
        for pattern in _ACTIVITY_HEADER_PATTERNS:
            for match in pattern.finditer(page.text):
                try:
                    number = int(match.group(1))
                except (IndexError, ValueError):
                    continue
                boundaries.append(
                    ActivityBoundary(
                        activity_number=number,
                        page_number=page.page_number,
                        char_offset=match.start(),
                        raw_header=match.group(0).strip(),
                    )
                )
    # Sort by (page, char_offset). Same activity may match twice if both
    # patterns fire — dedupe by (page, char_offset).
    boundaries.sort(key=lambda b: (b.page_number, b.char_offset))
    deduped: list[ActivityBoundary] = []
    seen: set[tuple[int, int]] = set()
    for boundary in boundaries:
        key = (boundary.page_number, boundary.char_offset)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(boundary)

    # OCR often loses the large colored activity number in this A2 CO layout,
    # while preserving the prompt "Vous écoutez la radio." If a page has that
    # listening prompt but no boundary, infer the next activity number from the
    # previous page boundary so the page is not merged into the prior activity.
    pages_with_boundary = {b.page_number for b in deduped}
    inferred: list[ActivityBoundary] = []
    last_boundary: ActivityBoundary | None = None
    for page in pages:
        explicit = [b for b in deduped if b.page_number == page.page_number]
        if explicit:
            last_boundary = explicit[-1]
            continue
        normalized = _normalize_for_match(page.text)
        if (
            last_boundary is not None
            and page.page_number not in pages_with_boundary
            and "vous ecoutez la radio" in normalized
        ):
            offset = normalized.find("vous ecoutez la radio")
            number = last_boundary.activity_number + 1
            inferred_boundary = ActivityBoundary(
                activity_number=number,
                page_number=page.page_number,
                char_offset=max(offset, 0),
                raw_header=f"{number}. Vous écoutez",
            )
            inferred.append(inferred_boundary)
            pages_with_boundary.add(page.page_number)
            last_boundary = inferred_boundary
    if inferred:
        deduped.extend(inferred)
        deduped.sort(key=lambda b: (b.page_number, b.char_offset))
    return deduped


def find_chapter_boundaries(
    pages: list[PageContent],
) -> list[ChapterBoundary]:
    """Scan for chapter / unité / leçon headers."""
    chapters: list[ChapterBoundary] = []
    for page in pages:
        for pattern in _CHAPTER_HEADER_PATTERNS:
            for match in pattern.finditer(page.text):
                try:
                    number = int(match.group(1))
                except (IndexError, ValueError):
                    continue
                chapters.append(
                    ChapterBoundary(
                        chapter_number=number,
                        page_number=page.page_number,
                    )
                )
    chapters.sort(key=lambda c: c.page_number)
    return chapters


def _chapter_for_page(
    page_number: int, chapters: list[ChapterBoundary]
) -> int | None:
    """Most recent chapter header at or before `page_number`."""
    current: int | None = None
    for chapter in chapters:
        if chapter.page_number > page_number:
            break
        current = chapter.chapter_number
    return current


def _classify_section(text: str) -> str:
    """Classify activity text as CE, CO, or UNKNOWN.

    Priority:
    1. Explicit "Compréhension écrite/orale" label inside the activity text.
    2. Listening cues (Piste/Track/écouter) → CO.
    3. Otherwise UNKNOWN — caller decides whether to default or skip.
    """
    normalized = _normalize_for_match(text)
    for pattern in _CO_SECTION_PATTERNS:
        if pattern.search(text) or pattern.search(normalized):
            return "CO"
    for pattern in _CE_SECTION_PATTERNS:
        if pattern.search(text) or pattern.search(normalized):
            return "CE"
    for pattern in _TRACK_CUE_PATTERNS:
        if pattern.search(text) or pattern.search(normalized):
            return "CO"
    return "UNKNOWN"


def _assemble_text(
    pages: list[PageContent],
    *,
    boundary: ActivityBoundary,
    next_boundary: ActivityBoundary | None,
    fallback_end_page: int,
) -> tuple[str, int]:
    """Concatenate page texts covering one activity's range.

    Returns (text, page_end).
    """
    end_page = (
        next_boundary.page_number - 1 if next_boundary is not None else fallback_end_page
    )
    if end_page < boundary.page_number:
        end_page = boundary.page_number

    parts: list[str] = []
    for page in pages:
        if page.page_number < boundary.page_number:
            continue
        if page.page_number > end_page:
            break
        if page.page_number == boundary.page_number:
            # Trim everything before the activity header on the header page.
            parts.append(page.text[boundary.char_offset :])
        else:
            parts.append(page.text)
    return "\n\n".join(parts).strip(), end_page


def detect_activities(
    pages: list[PageContent],
) -> list[ClassifiedActivity]:
    """End-to-end: find boundaries, group by chapter, classify, assemble text."""
    if not pages:
        return []

    boundaries = find_activity_boundaries(pages)
    if not boundaries:
        return []

    chapters = find_chapter_boundaries(pages)
    last_page = pages[-1].page_number

    classified: list[ClassifiedActivity] = []
    for idx, boundary in enumerate(boundaries):
        next_boundary = boundaries[idx + 1] if idx + 1 < len(boundaries) else None
        text, page_end = _assemble_text(
            pages,
            boundary=boundary,
            next_boundary=next_boundary,
            fallback_end_page=last_page,
        )
        section = _classify_section(text)
        chapter = _chapter_for_page(boundary.page_number, chapters)
        classified.append(
            ClassifiedActivity(
                activity_number=boundary.activity_number,
                section=section,
                chapter_number=chapter,
                title=boundary.raw_header,
                page_start=boundary.page_number,
                page_end=page_end,
                text=text,
            )
        )
    return classified


__all__ = [
    "ActivityBoundary",
    "ChapterBoundary",
    "ClassifiedActivity",
    "detect_activities",
    "find_activity_boundaries",
    "find_chapter_boundaries",
]
