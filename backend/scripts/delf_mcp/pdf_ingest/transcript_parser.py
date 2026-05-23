"""Parse CO transcripts from the answer/transcript PDF.

DELF prep books place transcripts in a section often titled "Transcriptions"
or "Transcription des enregistrements". Each transcript is preceded by an
activity header — the same pattern the answer parser already recognizes.

The transcript text is everything between one activity header and the next,
trimmed and joined into a single string. Used as `DelfExercise.transcript`
for CO papers (v3).
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from .pdf_reader import PageContent


_ACTIVITY_HEADER = re.compile(
    r"activit[ée]\s+(\d{1,3})\b",
    re.IGNORECASE,
)

# Markers that bound the transcripts section. Used to scope the parser so
# answer-key tables earlier in the answer PDF don't pollute transcripts.
_TRANSCRIPT_SECTION_HEADERS: tuple[re.Pattern[str], ...] = (
    re.compile(r"transcription[s]?\s+(?:des\s+enregistrements)?", re.IGNORECASE),
    re.compile(r"transcription[s]?\s+des\s+documents", re.IGNORECASE),
)

# Patterns that mark "extra" transcripts (documents WITHOUT questions). These
# appear within a CO activity's transcript block. v3 collects them into
# `DelfTestPaper.extra_transcripts`.
_EXTRA_DOC_HEADER = re.compile(
    r"^\s*document\s+(\d{1,3})\b",
    re.IGNORECASE | re.MULTILINE,
)


@dataclass
class Transcripts:
    """Per-activity transcripts plus any document-level extras."""

    main: dict[int, str] = field(default_factory=dict)
    # extras[activity_number] -> list of {id, content} dicts
    extras: dict[int, list[dict[str, Any]]] = field(default_factory=dict)
    warnings: list[dict[str, Any]] = field(default_factory=list)

    def for_activity(self, activity_number: int) -> str | None:
        return self.main.get(activity_number)

    def extras_for_activity(self, activity_number: int) -> list[dict[str, Any]]:
        return list(self.extras.get(activity_number, []))


def _scope_to_transcripts_section(text: str) -> str:
    """If a 'Transcriptions' header exists, return text from there onward.

    Otherwise return the full text. Avoids confusing answer-key tables with
    transcript bodies when both live in the same PDF.
    """
    for pattern in _TRANSCRIPT_SECTION_HEADERS:
        match = pattern.search(text)
        if match is not None:
            return text[match.start():]
    return text


def _split_into_activity_blocks(text: str) -> list[tuple[int, str]]:
    matches = list(_ACTIVITY_HEADER.finditer(text))
    if not matches:
        return []

    blocks: list[tuple[int, str]] = []
    for idx, match in enumerate(matches):
        try:
            activity_number = int(match.group(1))
        except ValueError:
            continue
        start = match.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        blocks.append((activity_number, text[start:end]))
    return blocks


def _split_extra_documents(
    activity_number: int, block_text: str
) -> tuple[str, list[dict[str, Any]]]:
    """Split a transcript block on 'Document N' headers.

    Everything before the first Document header is treated as the main
    transcript. Each Document block becomes one DelfExtraTranscript entry
    `{id, content}`. If no Document headers are present, the whole block is
    the main transcript and the extras list is empty.
    """
    matches = list(_EXTRA_DOC_HEADER.finditer(block_text))
    if not matches:
        return block_text.strip(), []

    main_text = block_text[: matches[0].start()].strip()
    extras: list[dict[str, Any]] = []
    for idx, match in enumerate(matches):
        doc_number = match.group(1)
        start = match.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(block_text)
        content = block_text[start:end].strip()
        if not content:
            continue
        extras.append({
            "id": f"act-{activity_number}-doc-{doc_number}",
            "content": content,
        })
    return main_text, extras


def parse_transcript_pdf(pages: list[PageContent]) -> Transcripts:
    """Parse all CO transcripts from a rendered answer/transcript PDF.

    Returns a `Transcripts` with `main[activity_number]` containing the
    primary transcript and `extras[activity_number]` for any Document blocks.
    Activities without a transcript are simply absent from the result; the
    caller can check via `for_activity`.
    """
    combined = "\n\n".join(p.text for p in pages)
    scoped = _scope_to_transcripts_section(combined)
    blocks = _split_into_activity_blocks(scoped)

    main: dict[int, str] = {}
    extras: dict[int, list[dict[str, Any]]] = {}
    warnings: list[dict[str, Any]] = []

    for activity_number, block_text in blocks:
        main_text, extra_docs = _split_extra_documents(activity_number, block_text)
        # Reject obviously useless blocks (just an answer key, no prose).
        # Heuristic: under 15 chars after stripping numeric/letter list entries.
        if len(main_text) < 15 and not extra_docs:
            continue
        if activity_number in main:
            warnings.append({
                "code": "ambiguous_transcript",
                "message": (
                    f"Activity {activity_number}: transcript block appeared "
                    "more than once; keeping the first."
                ),
            })
            continue
        if main_text:
            main[activity_number] = main_text
        if extra_docs:
            extras[activity_number] = extra_docs

    return Transcripts(main=main, extras=extras, warnings=warnings)


__all__ = ["Transcripts", "parse_transcript_pdf"]
