"""Import regular DELF B2 workbook exercises from the local book PDF.

This is intentionally narrow: it targets the non-Epreuve-blanche B2
``Je m'entraine`` comprehension exercises from the Hachette tout-public B2
book already present under ``backend/.local/delf-pdfs``.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import fitz

from scripts.delf_mcp.draft_service import save_draft
from scripts.delf_mcp.update_service import update_draft
from scripts.delf_mcp.validation import validate_content
from src.shared.delf_practice.test_paper_repository import DelfTestPaperRepository

BOOK_ID = "818818090-DELF-Tout-Public-B2"
LEVEL = "B2"
VARIANT = "tout-public-b2"


@dataclass(frozen=True)
class ExerciseSpec:
    section: str
    test_id: str
    title: str
    pages: tuple[int, ...]
    source_activity: int
    source_part: str
    audio_tracks: tuple[int, ...] = ()
    answers: tuple[str, ...] = ()
    start_marker: str | None = None
    end_marker: str | None = None


CO_AB_SPECS: tuple[ExerciseSpec, ...] = (
    ExerciseSpec(
        "CO",
        "tp-01",
        "Partie A - Activité 1",
        (18, 19),
        1,
        "A",
        (10,),
        ("c", "b", "a", "b", "c", "a", "b"),
        "Pourquoi les jeunes",
        "F. Écoutez",
    ),
    ExerciseSpec(
        "CO",
        "tp-02",
        "Partie A - Activité 2",
        (20,),
        2,
        "A",
        (11,),
        ("c", "b", "c", "c", "b", "a", "a"),
        "Marion et Manon",
        None,
    ),
    ExerciseSpec(
        "CO",
        "tp-03",
        "Partie A - Activité 3",
        (21,),
        3,
        "A",
        (12,),
        ("b", "c", "b", "c", "c", "a", "b"),
        "À la suite",
        None,
    ),
    ExerciseSpec(
        "CO",
        "tp-04",
        "Partie A - Activité 4",
        (22,),
        4,
        "A",
        (13,),
        ("b", "a", "b", "c", "c", "b", "c"),
        "Pourquoi, selon",
        None,
    ),
    ExerciseSpec(
        "CO",
        "tp-05",
        "Partie A - Activité 5",
        (23,),
        5,
        "A",
        (14,),
        ("c", "c", "a", "a", "a", "a", "a"),
        "Comment Marie",
        None,
    ),
    ExerciseSpec(
        "CO",
        "tp-06",
        "Partie A - Activité 6",
        (24,),
        6,
        "A",
        (15,),
        ("a", "b", "c", "b", "b", "c", "c"),
        "Qu’est-ce qui a principalement",
        None,
    ),
    ExerciseSpec(
        "CO",
        "tp-07",
        "Partie A - Activité 7",
        (25,),
        7,
        "A",
        (16,),
        ("b", "c", "c", "a", "b", "c", "c"),
        "Pour la philosophe",
        None,
    ),
    ExerciseSpec(
        "CO",
        "tp-08",
        "Partie A - Activité 8",
        (26,),
        8,
        "A",
        (17,),
        ("a", "a", "b", "c", "b", "c", "b"),
        "Pour Pierrick",
        None,
    ),
    ExerciseSpec(
        "CO",
        "tp-09",
        "Partie B - Activité 1",
        (29,),
        1,
        "B",
        (18,),
        ("b", "c", "a", "b", "a", "b", "a"),
        "D’après des statistiques",
        None,
    ),
    ExerciseSpec(
        "CO",
        "tp-10",
        "Partie B - Activité 2",
        (30,),
        2,
        "B",
        (19,),
        ("b", "a", "a", "c", "a", "a", "c"),
        "Le but de la compagnie",
        None,
    ),
    ExerciseSpec(
        "CO",
        "tp-11",
        "Partie B - Activité 3",
        (31,),
        3,
        "B",
        (20,),
        ("b", "b", "c", "b", "c", "a", "c"),
        "Quel problème",
        None,
    ),
    ExerciseSpec(
        "CO",
        "tp-12",
        "Partie B - Activité 4",
        (32,),
        4,
        "B",
        (21,),
        ("c", "c", "a", "b", "a", "a", "b"),
        "Qu’est-ce qui caractérise",
        None,
    ),
    ExerciseSpec(
        "CO",
        "tp-13",
        "Partie B - Activité 5",
        (33,),
        5,
        "B",
        (22,),
        ("a", "b", "a", "b", "b", "a", "b"),
        "D’après l’invité",
        None,
    ),
    ExerciseSpec(
        "CO",
        "tp-14",
        "Partie B - Activité 6",
        (34,),
        6,
        "B",
        (23,),
        ("a", "c", "c", "c", "c", "b", "a"),
        "Pourquoi Thomas",
        None,
    ),
    ExerciseSpec(
        "CO",
        "tp-15",
        "Partie B - Activité 7",
        (35,),
        7,
        "B",
        (24,),
        ("c", "b", "b", "a", "b", "a", "b"),
        "Pourquoi, selon",
        None,
    ),
    ExerciseSpec(
        "CO",
        "tp-16",
        "Partie B - Activité 8",
        (36,),
        8,
        "B",
        (25,),
        ("a", "a", "b", "b", "b", "a", "c"),
        "D’après Laura",
        None,
    ),
)

CO_C_SPECS: tuple[ExerciseSpec, ...] = (
    ExerciseSpec(
        "CO",
        "tp-17",
        "Partie C - Activité 1",
        (39,),
        1,
        "C",
        (26, 27, 28),
        ("a", "c", "a", "c", "a", "a"),
        "Sur quel principe",
        None,
    ),
    ExerciseSpec(
        "CO",
        "tp-18",
        "Partie C - Activité 2",
        (40,),
        2,
        "C",
        (29, 30, 31),
        ("b", "c", "c", "a", "b", "a"),
        "Selon Anne",
        None,
    ),
    ExerciseSpec(
        "CO",
        "tp-19",
        "Partie C - Activité 3",
        (41,),
        3,
        "C",
        (32, 33, 34),
        ("c", "a", "b", "b", "a", "b"),
        "Selon le journaliste",
        None,
    ),
    ExerciseSpec(
        "CO",
        "tp-20",
        "Partie C - Activité 4",
        (42,),
        4,
        "C",
        (35, 36, 37),
        ("b", "b", "b", "b", "a", "c"),
        "D’après la journaliste",
        None,
    ),
    ExerciseSpec(
        "CO",
        "tp-21",
        "Partie C - Activité 5",
        (43,),
        5,
        "C",
        (38, 39, 40),
        ("c", "c", "c", "c", "c", "b"),
        "La journaliste",
        None,
    ),
    ExerciseSpec(
        "CO",
        "tp-22",
        "Partie C - Activité 6",
        (44,),
        6,
        "C",
        (41, 42, 43),
        ("b", "b", "a", "c", "c", "b"),
        "D’après Karine",
        None,
    ),
    ExerciseSpec(
        "CO",
        "tp-23",
        "Partie C - Activité 7",
        (45,),
        7,
        "C",
        (44, 45, 46),
        ("c", "c", "c", "a", "c", "c"),
        "D’après Hélène",
        None,
    ),
    ExerciseSpec(
        "CO",
        "tp-24",
        "Partie C - Activité 8",
        (46,),
        8,
        "C",
        (47, 48, 49),
        ("b", "a", "a", "a", "a", "b"),
        "D’après Emmanuel",
        None,
    ),
)


POINT_LINE_RE = re.compile(r"[>/\\.\s]*\d(?:[,.]\d)?\s*point", re.IGNORECASE)
PAGE_NUM_RE = re.compile(r"^\d{1,3}$")
OPTION_RE = re.compile(
    r"^(?:[a-f][\.,»]?\s*)?(?:[.,?►]+\s*)?(?:[□■]|C\.?Q)\s*(.+)$",
    re.IGNORECASE,
)
NOISE_PREFIXES = (
    "Compréhension de l’oral",
    "Compréhension de l'oral",
    "Partie ",
    "Vous allez écouter",
    "Vous écoutez",
    "Lisez les questions",
    "Attention",
    "Le questionnaire",
    "» Répondre",
    "D À l’aide",
    "E. À l’aide",
    "Pour chaque document",
    "DOCUMENT",
    "Lisez les questions",
)


def _page_text(doc: fitz.Document, pages: tuple[int, ...]) -> str:
    return "\n".join(doc.load_page(page - 1).get_text("text") for page in pages)


def _clean_line(line: str) -> str:
    line = line.strip()
    line = re.sub(r"^[•■*«<>\\-–—\\s]+", "", line)
    line = re.sub(
        r"[>/\\.\s]*\d(?:[,.]\d)?\s*p(?:oi|œ|ei)nt.*$", "", line, flags=re.IGNORECASE
    )
    line = re.sub(r"\s+", " ", line)
    return line.strip()


def _slice_text(text: str, start_marker: str | None, end_marker: str | None) -> str:
    if start_marker:
        start = text.find(start_marker)
        if start >= 0:
            text = text[start:]
    if end_marker:
        end = text.find(end_marker)
        if end >= 0:
            text = text[:end]
    return text


def _is_noise(line: str) -> bool:
    if not line:
        return True
    if PAGE_NUM_RE.match(line):
        return True
    if POINT_LINE_RE.fullmatch(line):
        return True
    if "DOCUMENT" in line.upper() and len(line) < 32:
        return True
    return any(line.startswith(prefix) for prefix in NOISE_PREFIXES)


def extract_questions(
    text: str, *, start_marker: str | None, end_marker: str | None
) -> list[dict[str, Any]]:
    text = _slice_text(text, start_marker, end_marker)
    questions: list[dict[str, Any]] = []
    current_lines: list[str] = []
    current_options: list[str] = []

    def flush() -> None:
        nonlocal current_lines, current_options
        question_text = " ".join(current_lines).strip()
        if question_text and len(current_options) == 3:
            questions.append(
                {
                    "question_text": question_text,
                    "options": list(current_options),
                }
            )
        current_lines = []
        current_options = []

    for raw in text.splitlines():
        line = _clean_line(raw)
        if _is_noise(line):
            continue
        opt_match = OPTION_RE.match(line)
        if opt_match:
            option = _clean_line(opt_match.group(1))
            if option:
                current_options.append(option)
                if len(current_options) == 3:
                    flush()
            continue
        if current_options:
            continue
        line = re.sub(r"^(?:\d{1,2}|[A-F])\s*[\.,»]\s*", "", line)
        if line:
            current_lines.append(line)
    flush()
    return questions


def answer_index(letter: str) -> int:
    return ord(letter.lower()) - ord("a")


def audio_filename(track: int) -> str:
    return f"DELF_TP_B2_Piste{track:03d}.mp3"


def build_paper(spec: ExerciseSpec, doc: fitz.Document) -> dict[str, Any]:
    raw_text = _page_text(doc, spec.pages)
    questions = extract_questions(
        raw_text,
        start_marker=spec.start_marker,
        end_marker=spec.end_marker,
    )
    if len(questions) != len(spec.answers):
        raise ValueError(
            f"{spec.test_id} expected {len(spec.answers)} questions, got {len(questions)}"
        )

    subquestions = []
    for idx, (question, answer) in enumerate(zip(questions, spec.answers), start=1):
        subquestions.append(
            {
                "id": f"{spec.test_id}-q{idx}",
                "number": idx,
                "question_text": question["question_text"],
                "type": "multiple_choice",
                "options": question["options"],
                "correct_answer": answer_index(answer),
                "points": 1.0,
            }
        )

    source_ref = {
        "book_id": BOOK_ID,
        "activity_id": f"{BOOK_ID}:CO:part-{spec.source_part.lower()}:activity-{spec.source_activity}",
        "activity_number": spec.source_activity,
        "chapter_number": None,
        "section": spec.section,
        "page_start": min(spec.pages),
        "page_end": max(spec.pages),
        "source_activities": [spec.source_activity],
        "source_pages": list(spec.pages),
    }
    content = {
        "test_id": spec.test_id,
        "section": spec.section,
        "audio_filename": (
            audio_filename(spec.audio_tracks[0]) if spec.audio_tracks else None
        ),
        "audio_filenames": [audio_filename(track) for track in spec.audio_tracks],
        "exercises": [
            {
                "id": f"{spec.test_id}-exercise",
                "title": spec.title,
                "type": "listening_comprehension",
                "instruction": "Lisez les questions, écoutez le document puis répondez.",
                "questions": subquestions,
                "source_ref": source_ref,
            }
        ],
        "extra_transcripts": [],
        "source_ref": source_ref,
    }
    return content


def upsert_paper(content: dict[str, Any], *, dry_run: bool) -> dict[str, Any]:
    validation = validate_content(content)
    if not validation.get("valid"):
        return {
            "success": False,
            "test_id": content.get("test_id"),
            "error": "validation_failed",
            "validation": {k: v for k, v in validation.items() if k != "paper"},
        }
    if dry_run:
        return {
            "success": True,
            "test_id": content["test_id"],
            "dry_run": True,
            "question_count": len(content["exercises"][0]["questions"]),
        }

    repo = DelfTestPaperRepository()
    existing = repo.get_by_test_id(
        content["test_id"], LEVEL, VARIANT, content["section"]
    )
    if existing:
        result = update_draft(draft_id=str(existing.id), content=content)
        result["mode"] = "update"
        return result
    result = save_draft(
        level=LEVEL,
        variant=VARIANT,
        section=content["section"],
        content=content,
    )
    result["mode"] = "save"
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--section", choices=["CO"], default="CO")
    parser.add_argument("--part", choices=["ab", "c", "all"], default="ab")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--out",
        default=".local/delf-extracts/b2-regular-co-ab-import-summary.json",
    )
    args = parser.parse_args()

    pdf_path = Path(".local/delf-pdfs/818818090-DELF-Tout-Public-B2.pdf")
    if not pdf_path.exists():
        raise FileNotFoundError(pdf_path)

    if args.part == "ab":
        specs = list(CO_AB_SPECS)
    elif args.part == "c":
        specs = list(CO_C_SPECS)
    else:
        specs = [*CO_AB_SPECS, *CO_C_SPECS]
    if args.limit:
        specs = specs[: args.limit]

    results = []
    with fitz.open(pdf_path) as doc:
        for spec in specs:
            try:
                content = build_paper(spec, doc)
                result = upsert_paper(content, dry_run=args.dry_run)
                result["test_id"] = spec.test_id
                result["title"] = spec.title
                result["section"] = spec.section
                result["question_count"] = len(content["exercises"][0]["questions"])
            except Exception as exc:
                result = {
                    "success": False,
                    "test_id": spec.test_id,
                    "title": spec.title,
                    "section": spec.section,
                    "error": str(exc),
                }
            results.append(result)

    summary = {
        "success_count": sum(1 for item in results if item.get("success")),
        "failed_count": sum(1 for item in results if not item.get("success")),
        "dry_run": args.dry_run,
        "results": results,
    }
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if summary["failed_count"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
