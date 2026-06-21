"""Import regular DELF B2 workbook CE exercises from the local PDFs.

This targets the non-Epreuve-blanche ``Je m'entraine`` reading-comprehension
activities from the Hachette tout-public B2 book. Answers are transcribed from
``DELFB2TP_TC.pdf``.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
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
class CeExerciseSpec:
    test_id: str
    title: str
    pages: tuple[int, ...]
    source_part: str
    source_activity: int
    answers: tuple[str, ...]
    document_start: str
    question_start: str
    end_marker: str | None = None


def _answers(raw: str) -> tuple[str, ...]:
    return tuple(raw.split())


CE_SPECS: tuple[CeExerciseSpec, ...] = (
    CeExerciseSpec("tp-01", "Partie A - Activité 2 : Les bienfaits de l'art sur la santé", (58, 59), "A", 2, _answers("b a c c b c b"), "Vous lisez cet article", "Pour répondre aux questions"),
    CeExerciseSpec("tp-02", "Partie A - Activité 3 : Mes placards et moi", (60, 61), "A", 3, _answers("a a a b b c c"), "Vous lisez cet article", "Pour répondre aux questions"),
    CeExerciseSpec("tp-03", "Partie A - Activité 4 : Une nouvelle génération de cheffes", (62, 63), "A", 4, _answers("c a c a a b a"), "Vous lisez cet article", "Pour répondre aux questions"),
    CeExerciseSpec("tp-04", "Partie A - Activité 5 : Les influenceurs, nouveaux favoris de la mode", (64, 65), "A", 5, _answers("b b c a b b a"), "Vous lisez cet article", "Pour répondre aux questions"),
    CeExerciseSpec("tp-05", "Partie A - Activité 6 : Pénurie de bouquinistes sur les bords de la Seine", (66, 67), "A", 6, _answers("b c c a c b a"), "Vous lisez cet article", "Pour répondre aux questions"),
    CeExerciseSpec("tp-06", "Partie A - Activité 7 : Le lycée Winston-Churchill à l'heure des tablettes numériques", (68, 69), "A", 7, _answers("a c a c a a a"), "Vous lisez cet article", "Pour répondre aux questions"),
    CeExerciseSpec("tp-07", "Partie A - Activité 8 : La Fémis, meilleure école de cinéma française", (70, 71), "A", 8, _answers("a c a c c c a"), "Vous lisez cet article", "Pour répondre aux questions"),
    CeExerciseSpec("tp-08", "Partie B - Activité 1 : Comment aider les seniors à maîtriser les outils numériques ?", (72, 73, 74), "B", 1, _answers("a c c c b a b"), "Lisez cet article", "Pour répondre aux questions"),
    CeExerciseSpec("tp-09", "Partie B - Activité 2 : Trop aimer son animal de compagnie peut-il nuire à sa santé ?", (75, 76), "B", 2, _answers("c c b a b c b"), "Vous lisez cet article", "Pour répondre aux questions"),
    CeExerciseSpec("tp-10", "Partie B - Activité 3 : Le temps partagé pour prendre en main sa vie professionnelle ?", (77, 78), "B", 3, _answers("b c a b a a b"), "Vous lisez cet article", "Pour répondre aux questions"),
    CeExerciseSpec("tp-11", "Partie B - Activité 4 : Les plateformes numériques d'autoédition sont-elles l'avenir de l'édition ?", (79, 80), "B", 4, _answers("c b a b b c b"), "Vous lisez cet article", "Pour répondre aux questions"),
    CeExerciseSpec("tp-12", "Partie B - Activité 5 : De plus en plus d'adolescents deviennent jeunes sapeurs-pompiers", (81, 82), "B", 5, _answers("b c a a a b b"), "Vous lisez cet article", "Pour répondre aux questions"),
    CeExerciseSpec("tp-13", "Partie B - Activité 6 : La thérapie-photo, une méthode efficace pour oublier ses complexes", (83, 84), "B", 6, _answers("c b c c b b c"), "Vous lisez cet article", "Pour répondre aux questions"),
    CeExerciseSpec("tp-14", "Partie B - Activité 7 : Job étudiant : frein ou avantage à l'insertion professionnelle ?", (85, 86), "B", 7, _answers("c c b a c b b"), "Vous lisez cet article", "Pour répondre aux questions"),
    CeExerciseSpec("tp-15", "Partie B - Activité 8 : L'intelligence artificielle peut-elle créer de l'art ?", (87, 88), "B", 8, _answers("c b a b a b a"), "Vous lisez cet article", "Pour répondre aux questions"),
    CeExerciseSpec("tp-16", "Partie C - Activité 1 : Manuel papier ou manuel numérique ?", (89, 90, 91, 92), "C", 1, _answers("a b a c b c"), "Vous lisez l'opinion", "À quelle personne associez-vous"),
    CeExerciseSpec("tp-17", "Partie C - Activité 2 : Pour ou contre la gratuité des transports publics ?", (92, 93, 94), "C", 2, _answers("a b a c a c"), "Vous lisez l'opinion de ces trois personnes dans les commentaires", "À quelle personne associez-vous", "Pour ou contre les applications des banques"),
    CeExerciseSpec("tp-18", "Partie C - Activité 3 : Pour ou contre les applications des banques en ligne ?", (94, 95), "C", 3, _answers("a c c b a b"), "Vous lisez l'opinion de ces trois personnes sur un forum belge", "À quelle personne associez-vous", "Vous lisez l'opinion de ces trois personnes sur un forum de débats"),
    CeExerciseSpec("tp-19", "Partie C - Activité 4 : Pour ou contre l'énergie éolienne ?", (95, 96, 97), "C", 4, _answers("b a b a c b"), "Vous lisez l'opinion de ces trois personnes sur un forum de débats", "À quelle personne associez-vous", "Emmener son animal"),
    CeExerciseSpec("tp-20", "Partie C - Activité 5 : Emmener son animal de compagnie au travail ?", (97, 98), "C", 5, _answers("a b c c a a"), "Vous iisez l'opinion", "À quelle personne associez-vous", "Vous lisez l'opinion de ces trois personnes sur un forum français"),
    CeExerciseSpec("tp-21", "Partie C - Activité 6 : L'école à la maison ?", (98, 99, 100), "C", 6, _answers("a b a c b c"), "Vous lisez l'opinion de ces trois personnes sur un forum français", "À quelle personne associez-vous", "L'alimentation vivante"),
    CeExerciseSpec("tp-22", "Partie C - Activité 7 : L'alimentation vivante : pour ou contre manger cru ?", (100, 101), "C", 7, _answers("c b b c a a"), "Vous lisez l'opinion de ces trois personnes à la suite", "À quelle personne associez-vous", "Vous lisez l'opinion de ces trois personnes sur un forum dont le sujet"),
    CeExerciseSpec("tp-23", "Partie C - Activité 8 : Pour ou contre les stages de team building en entreprise ?", (101, 102), "C", 8, _answers("a b b c c a"), "Vous lisez l'opinion de ces trois personnes sur un forum dont le sujet", "À quelle personne associez-vous"),
    CeExerciseSpec("tp-24", "Partie A - Activité 1 : Les réussites du modèle d'intégration français", (55, 56, 57), "A", 1, _answers("a a b b a a a"), "La France réussit à donner un toit", "Selon le journaliste"),
)


OPTION_RE = re.compile(
    r"^(?:([abc])\s*[\.,»]?\s*)?(?:[.,?►>]*\s*)?"
    r"(?:[□■]|C\.?Q|j\s*□|a»\s*□)\s*(.*)$",
    re.IGNORECASE,
)
QUESTION_NUMBER_RE = re.compile(r"^(?:\d{1,2}\s*[\.,»)]|[A-F]\s*[\.,»)])\s*(.*)$")


def _strip_accents(value: str) -> str:
    value = value.replace("’", "'").replace("‘", "'").replace("`", "'")
    return "".join(
        char
        for char in unicodedata.normalize("NFD", value)
        if unicodedata.category(char) != "Mn"
    )


def _find_marker(text: str, marker: str) -> int:
    index = text.find(marker)
    if index >= 0:
        return index
    return _strip_accents(text).lower().find(_strip_accents(marker).lower())


def _slice_from_marker(text: str, marker: str) -> str:
    index = _find_marker(text, marker)
    return text[index:] if index >= 0 else text


def _slice_before_marker(text: str, marker: str | None) -> str:
    if not marker:
        return text
    index = text.find(marker)
    if index < 0:
        index = _strip_accents(text).lower().find(_strip_accents(marker).lower())
    return text[:index] if index >= 0 else text


def _page_text(doc: fitz.Document, pages: tuple[int, ...]) -> str:
    text = "\n".join(doc.load_page(page - 1).get_text("text") for page in pages)
    text = text.replace("\u00ad", "")
    # Join words split at PDF line endings, e.g. "pres-\ncrire".
    text = re.sub(r"(?<=\w)-\n(?=\w)", "", text)
    return text


def _clean_line(line: str) -> str:
    line = line.strip()
    for bad in ("ç_j", "Si)", "(□)", "(a)", "( J)", "( j)", "(ja)", "(EJ)", "(gj)", "(f£j)"):
        line = line.replace(bad, "□")
    line = re.sub(r"^[•■*«<>\\–—\s]+", "", line)
    line = re.sub(
        r"[>/►.\s]*\d(?:[,.]\d)?\s*p(?:oint|aint).*$",
        "",
        line,
        flags=re.IGNORECASE,
    )
    line = re.sub(r"^(?:5|10|15|20|25|30|35)\s+", "", line)
    line = re.sub(r"\s+", " ", line)
    return line.strip()


def _is_noise(line: str) -> bool:
    if not line:
        return True
    if re.fullmatch(r"\d{1,3}", line):
        return True
    if line in {
        "a", "b", "c", "j", "r", "I", "l/", "X", "i", "l2", "J", "I J", "l J", "k J", "V", ">", "KI",
        "_ Je m'entraîne", "Je m'entraîne",
    }:
        return True
    if (
        "Compréhension des écrits" in line
        or line.startswith("Comprendre un texte")
        or line.startswith("Comprendre le point")
    ):
        return True
    return bool(re.fullmatch(r"[>/►.\s]*", line))


def _extract_lines(text: str) -> list[str]:
    lines: list[str] = []
    for raw in text.splitlines():
        line = _clean_line(raw)
        if not _is_noise(line):
            lines.append(line)
    return lines


def _repair_pdf_line_breaks(lines: list[str]) -> list[str]:
    repaired: list[str] = []
    for line in lines:
        if not line or not repaired:
            repaired.append(line)
            continue
        previous = repaired[-1]
        if not previous:
            repaired.append(line)
            continue
        if previous.endswith("-") and re.match(r"^[a-zàâäéèêëîïôöùûüç]", line):
            repaired[-1] = f"{previous}{line}"
            continue
        repaired.append(line)
    return repaired


def _is_question_instruction(line: str) -> bool:
    return (
        line.startswith("Pour répondre aux questions")
        or line.startswith("À quelle personne associez-vous")
        or line.startswith("Pour chaque affirmation")
    )


def _parse_questions(question_text: str) -> list[dict[str, Any]]:
    parsed: list[dict[str, Any]] = []
    question_lines: list[str] = []
    options: list[str] = []

    def flush() -> None:
        nonlocal question_lines, options
        text = " ".join(question_lines).strip()
        if text and len(options) == 3:
            parsed.append({"question_text": text, "options": list(options)})
        question_lines = []
        options = []

    for line in _extract_lines(question_text):
        if _is_question_instruction(line):
            continue
        option_match = OPTION_RE.match(line)
        if option_match:
            option = _clean_line(option_match.group(2))
            if option:
                options.append(option)
                if len(options) == 3:
                    flush()
            continue

        question_match = QUESTION_NUMBER_RE.match(line)
        if question_match:
            line = _clean_line(question_match.group(1))

        if options:
            options[-1] = f"{options[-1]} {line}".strip()
        else:
            question_lines.append(line)

    flush()
    return parsed


def _clean_document_text(text: str) -> str:
    raw_lines = _repair_pdf_line_breaks(_extract_lines(text))
    lines: list[str] = []
    skip_lines = {"X", "i", "l2", "J", "I J", "l J", "k J", "V", ">", "KI", "LJ", "L J", "—", "Je m'entraîne"}
    skip_fragments = (
        "http://",
        "https://",
        "HMIBc",
        "PH 7",
        "I >",
        "|···",
        "-<",
        "6'est parti",
    )
    idx = 0
    while idx < len(raw_lines):
        line = raw_lines[idx]
        if line in skip_lines:
            idx += 1
            continue
        if any(fragment in line for fragment in skip_fragments):
            idx += 1
            continue
        if len(line) <= 2 and not line.isalnum():
            idx += 1
            continue
        if (
            len(line) == 1
            and line.isalpha()
            and idx + 1 < len(raw_lines)
            and raw_lines[idx + 1][:1].islower()
        ):
            lines.append(f"{line}{raw_lines[idx + 1]}")
            idx += 2
            continue
        lines.append(line)
        normalized = _strip_accents(line).lower()
        if normalized.startswith("d'apres ") or normalized.startswith("d’apres "):
            break
        if normalized.startswith("certaines phrases comportent des guillemets"):
            lines.pop()
            break
        if "repondre aux questions type delf" in normalized:
            lines.pop()
            break
        if normalized.startswith("1. se defendre"):
            lines.pop()
            break
        idx += 1

    cleaned = "\n".join(lines)
    replacements = {
        "rt-thérapie": "Art-thérapie",
        "fra\ngiles": "fragiles",
        "pres\ncrire": "prescrire",
        "initia\ntive": "initiative",
        "d’exposi\ntion": "d’exposition",
        "d'exposi\ntion": "d’exposition",
        "d’art-théra\npie": "d’art-thérapie",
        "d'art-théra\npie": "d’art-thérapie",
        "ce\nquelle ressent": "ce qu’elle ressent",
        "Centre na\ntional": "Centre national",
        "Celui-ci orga\nnise": "Celui-ci organise",
        "psychia\ntrie": "psychiatrie",
        "qui inter\nviennent": "qui interviennent",
        "Organisation mon\ndiale": "Organisation mondiale",
        "montre com\nment": "montre comment",
        "pro\nblèmes": "problèmes",
        "c musée": "Ce musée",
        "osée Leclerc": "Josée Leclerc",
        "d’aArt-thérapie": "d’art-thérapie",
        "d'aArt-thérapie": "d’art-thérapie",
        "quelles ressent": "qu’elle ressent",
        "ontréal compte": "Montréal compte",
        "n rapport": "Un rapport",
        "\na musique": "\nLa musique",
        "\nn France": "\nEn France",
        "A l’hôpital": "À l’hôpital",
        "Déplus": "De plus",
        "Vous iisez": "Vous lisez",
        "j ai I appii": "j’ai l’appli",
        "Lecole": "L’école",
        "Remi": "Rémi",
        "cdntre": "contre",
        "ΓΙΑ": "l’IA",
        "ie dictionnaire": "le dictionnaire",
        "// faut": "Il faut",
        "Maisfinalement": "Mais finalement",
        "ilfaut": "il faut",
        "temps four": "temps pour",
        "excep35 tionnel": "exceptionnel",
        "surlignés (1 à 5)": "surlignés (1 à 5)",
        "prix I": "prix !",
        "\nJe ne comprends pas la politique.": "\n« Je ne comprends pas la politique.",
    }
    for bad, good in replacements.items():
        cleaned = cleaned.replace(bad, good)
    cleaned = re.sub(
        r"\n(?:L ?J\n)?(?:Bernard\nCatherine|Saloua\nBernadette|Abdoula)\s*$",
        "",
        cleaned,
    )
    cleaned = re.sub(r"\nL\s?J\s*$", "", cleaned)
    cleaned = re.sub(r"\nV\s*\nD’après", "\nD’après", cleaned)
    cleaned = re.sub(r"\nV\s*$", "", cleaned)
    if cleaned.endswith("\nLJ"):
        cleaned = cleaned[:-3]
    if cleaned.endswith("\nL J"):
        cleaned = cleaned[:-4]
    cleaned = cleaned.replace("\nV   \nD’après", "\nD’après")
    cleaned = re.sub(r"_+", "", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def _answer_index(letter: str) -> int:
    return ord(letter.lower()) - ord("a")


def _finalize_document_text(text: str) -> str:
    text = re.sub(r"\nL\s?J\s*$", "", text)
    text = re.sub(r"\nV\s*\nD’après", "\nD’après", text)
    text = re.sub(r"\nV\s*$", "", text)
    return text.strip()


def build_paper(spec: CeExerciseSpec, doc: fitz.Document) -> dict[str, Any]:
    raw_text = _page_text(doc, spec.pages)
    scoped = _slice_from_marker(raw_text, spec.document_start)
    scoped = _slice_before_marker(scoped, spec.end_marker)
    question_index = _find_marker(scoped, spec.question_start)
    if question_index < 0:
        raise ValueError(f"{spec.test_id} question marker not found")

    document_text = _finalize_document_text(_clean_document_text(scoped[:question_index]))
    question_text = scoped[question_index:]
    questions = _parse_questions(question_text)
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
                "correct_answer": _answer_index(answer),
                "points": 1.0,
            }
        )

    source_ref = {
        "book_id": BOOK_ID,
        "activity_id": f"{BOOK_ID}:CE:part-{spec.source_part.lower()}:activity-{spec.source_activity}",
        "activity_number": spec.source_activity,
        "chapter_number": None,
        "section": "CE",
        "page_start": min(spec.pages),
        "page_end": max(spec.pages),
        "source_activities": [spec.source_activity],
        "source_pages": list(spec.pages),
    }
    return {
        "test_id": spec.test_id,
        "section": "CE",
        "audio_filename": None,
        "audio_filenames": [],
        "exercises": [
            {
                "id": f"{spec.test_id}-exercise",
                "title": spec.title,
                "type": "reading_comprehension",
                "instruction": "Lisez le document puis répondez aux questions.",
                "document": {
                    "type": "article" if spec.source_part in {"A", "B"} else "forum",
                    "title": spec.title.split(" : ", 1)[-1],
                    "content": document_text,
                },
                "questions": subquestions,
                "source_ref": source_ref,
            }
        ],
        "extra_transcripts": [],
        "source_ref": source_ref,
    }


def upsert_paper(content: dict[str, Any], *, dry_run: bool) -> dict[str, Any]:
    validation = validate_content(content)
    if not validation.get("valid"):
        return {
            "success": False,
            "test_id": content.get("test_id"),
            "error": "validation_failed",
            "validation": {key: val for key, val in validation.items() if key != "paper"},
        }
    if dry_run:
        return {
            "success": True,
            "test_id": content["test_id"],
            "dry_run": True,
            "question_count": len(content["exercises"][0]["questions"]),
        }

    repo = DelfTestPaperRepository()
    existing = repo.get_by_test_id(content["test_id"], LEVEL, VARIANT, "CE")
    if existing:
        result = update_draft(draft_id=str(existing.id), content=content)
        result["mode"] = "update"
        return result

    result = save_draft(level=LEVEL, variant=VARIANT, section="CE", content=content)
    result["mode"] = "save"
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--out",
        default=".local/delf-extracts/b2-regular-ce-import-summary.json",
    )
    parser.add_argument(
        "--papers-out",
        default=".local/delf-extracts/b2-regular-ce-built-papers.json",
    )
    args = parser.parse_args()

    pdf_path = Path(".local/delf-pdfs/818818090-DELF-Tout-Public-B2.pdf")
    if not pdf_path.exists():
        raise FileNotFoundError(pdf_path)

    specs = list(CE_SPECS)
    if args.limit:
        specs = specs[: args.limit]

    results: list[dict[str, Any]] = []
    built_papers: list[dict[str, Any]] = []
    with fitz.open(pdf_path) as doc:
        for spec in specs:
            try:
                content = build_paper(spec, doc)
                built_papers.append(content)
                result = upsert_paper(content, dry_run=args.dry_run)
                result["test_id"] = spec.test_id
                result["title"] = spec.title
                result["section"] = "CE"
                result["question_count"] = len(content["exercises"][0]["questions"])
            except Exception as exc:
                result = {
                    "success": False,
                    "test_id": spec.test_id,
                    "title": spec.title,
                    "section": "CE",
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
    out_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    papers_path = Path(args.papers_out)
    papers_path.parent.mkdir(parents=True, exist_ok=True)
    papers_path.write_text(json.dumps(built_papers, ensure_ascii=False, indent=2), encoding="utf-8")

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if summary["failed_count"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
