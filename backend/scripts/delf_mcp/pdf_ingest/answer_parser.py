"""Parse a DELF answer/transcript PDF for answer keys by activity number.

DELF prep books typically present the answer key as either:

  Activité 1
  1. b   2. a   3. c

…or a labelled-list form:

  Activité 1 : 1-b, 2-a, 3-c

…or one answer per line:

  Activité 1
  1. b
  2. a
  3. c

This module normalizes all three shapes into a single dict mapping
`activity_number → {question_number: answer_index}` where `answer_index`
is the 0-based position into the option list (a→0, b→1, c→2, d→3...).
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

# A single answer entry. Captures (question_number, letter).
# Matches "1. b", "1) b", "1-b", "1: b", "1 b" (loose).
_ANSWER_ENTRY = re.compile(
    r"(\d{1,2})\s*[\.\)\-:]\s*([a-fA-F])\b",
)


@dataclass
class AnswerKey:
    """Per-activity answer key extracted from the answer PDF."""

    answers: dict[int, dict[int, int]] = field(default_factory=dict)
    warnings: list[dict[str, Any]] = field(default_factory=list)

    def for_activity(self, activity_number: int) -> dict[int, int] | None:
        return self.answers.get(activity_number)


def _letter_to_index(letter: str) -> int:
    """a → 0, b → 1, c → 2, d → 3, e → 4, f → 5."""
    return ord(letter.lower()) - ord("a")


def _split_into_activity_blocks(text: str) -> list[tuple[int, str]]:
    """Return [(activity_number, block_text), ...] in document order."""
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


def _parse_block(block_text: str) -> dict[int, int]:
    """Extract `{question_number: answer_index}` from one activity block."""
    answers: dict[int, int] = {}
    for match in _ANSWER_ENTRY.finditer(block_text):
        try:
            qnum = int(match.group(1))
        except ValueError:
            continue
        # Defensive bound — DELF activities rarely exceed 10 questions, and
        # values above 20 are probably page numbers or other noise.
        if qnum < 1 or qnum > 20:
            continue
        answers[qnum] = _letter_to_index(match.group(2))
    return answers


def parse_answer_pdf(pages: list[PageContent]) -> AnswerKey:
    """Parse all answer-key activity blocks from a rendered answer PDF.

    Returns an `AnswerKey` with one entry per detected activity. Activities
    without any answer entries are dropped silently — the activity is still
    surfaced as a `missing_answer_key` warning at extraction time.
    """
    combined = "\n\n".join(p.text for p in pages)
    blocks = _split_into_activity_blocks(combined)
    answers: dict[int, dict[int, int]] = {}
    warnings: list[dict[str, Any]] = []
    for activity_number, block_text in blocks:
        parsed = _parse_block(block_text)
        if not parsed:
            continue
        if activity_number in answers:
            # Same activity number appeared twice. Merge and warn.
            existing = answers[activity_number]
            for qnum, idx in parsed.items():
                if qnum in existing and existing[qnum] != idx:
                    warnings.append({
                        "code": "ambiguous_answer_key",
                        "message": (
                            f"Activity {activity_number} Q{qnum}: conflicting "
                            f"answer ({existing[qnum]} vs {idx})."
                        ),
                    })
            existing.update(parsed)
        else:
            answers[activity_number] = parsed

    return AnswerKey(answers=answers, warnings=warnings)


__all__ = ["AnswerKey", "parse_answer_pdf"]
