"""Sample DelfTestPaper payloads for validation tests."""

from __future__ import annotations

import copy


VALID_CE_PAPER: dict = {
    "test_id": "tp-01",
    "section": "CE",
    "audio_filename": None,
    "exercises": [
        {
            "id": "ex-1",
            "title": "Exercice 1",
            "question_text": "Lisez le texte et choisissez la bonne reponse.",
            "type": "multiple_choice",
            "options": ["Paris", "Lyon", "Marseille", "Lille"],
            "correct_answer": 0,
            "points": 1.0,
        },
        {
            "id": "ex-2",
            "title": "Exercice 2",
            "type": "reading_comprehension",
            "document": {
                "type": "article",
                "title": "Un article",
                "content": "Texte de l'article",
            },
            "questions": [
                {
                    "id": "ex-2-q1",
                    "number": 1,
                    "question_text": "Question 1",
                    "type": "multiple_choice",
                    "options": ["Oui", "Non"],
                    "correct_answer": 1,
                    "points": 0.5,
                },
                {
                    "id": "ex-2-q2",
                    "number": 2,
                    "question_text": "Question 2",
                    "type": "multiple_choice",
                    "options": ["A", "B", "C"],
                    "correct_answer": 2,
                    "points": 0.5,
                },
            ],
        },
    ],
}


def clone(payload: dict) -> dict:
    return copy.deepcopy(payload)


def paper_missing_required_field() -> dict:
    p = clone(VALID_CE_PAPER)
    del p["test_id"]
    return p


def paper_duplicate_exercise_id() -> dict:
    p = clone(VALID_CE_PAPER)
    p["exercises"][1]["id"] = "ex-1"
    return p


def paper_duplicate_subquestion_id() -> dict:
    p = clone(VALID_CE_PAPER)
    p["exercises"][1]["questions"][1]["id"] = "ex-2-q1"
    return p


def paper_correct_answer_out_of_range_flat() -> dict:
    p = clone(VALID_CE_PAPER)
    p["exercises"][0]["correct_answer"] = 7
    return p


def paper_correct_answer_out_of_range_nested() -> dict:
    p = clone(VALID_CE_PAPER)
    p["exercises"][1]["questions"][0]["correct_answer"] = 9
    return p


def paper_ce_with_audio() -> dict:
    p = clone(VALID_CE_PAPER)
    p["audio_filename"] = "audio.mp3"
    return p


def paper_nested_plus_flat_mcq() -> dict:
    p = clone(VALID_CE_PAPER)
    # ex-2 has questions[] — also setting flat MCQ fields must fail
    p["exercises"][1]["options"] = ["X", "Y"]
    p["exercises"][1]["correct_answer"] = 0
    return p


VALID_PAPER_JSON_STRING_OK = True  # marker, see test_validation.py
