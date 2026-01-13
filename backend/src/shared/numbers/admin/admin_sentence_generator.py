from src.shared.numbers.sentence_blueprints import SentenceBlueprint
from src.infra.ai.client import AIClient
from src.extensions import logger


def _is_valid_sentence(sentence: str, spoken_chunks: list[str]) -> bool:
    s = sentence.strip().lower()

    if not s:
        return False

    # obvious LLM meta / error text
    forbidden = (
        "i’m sorry",
        "je suis désolé",
        "as an ai",
        "en tant que",
        "cannot",
        "je ne peux pas",
        "gemini",
        "error",
        "###",
        "```",
    )
    if any(f in s for f in forbidden):
        return False

    # must contain each chunk exactly once
    for chunk in spoken_chunks:
        if sentence.count(chunk) != 1:
            return False

    # no digits allowed
    if any(c.isdigit() for c in sentence):
        return False

    # too long → probably explanation
    if len(sentence.split()) > 25:
        return False

    return True


def generate_sentence(
    spoken_chunks: list[str],
    blueprint: SentenceBlueprint,
    max_attempts: int = 1,
) -> str:
    """
    Generates a natural spoken French sentence incorporating the given number chunks.
    """
    number_text = " ".join(spoken_chunks)

    prompt = f"""
        You are a native French speaker helping to create a listening exercise
        for a language-learning application.

        TASK:
        Write ONE short, natural sentence in spoken French (France)
        that naturally incorporates the following number sequence:

        "{number_text}"

        CONTEXT:
        - Situation: {blueprint.context}
        - Description: {blueprint.description}
        - Tone: {blueprint.tone}

        RULES (STRICT):
        1. Use the number sequence EXACTLY as provided above.
        Do NOT change, reorder, or rephrase any part of it.
        2. Do NOT add any other numbers, digits, or numeric expressions.
        3. The sentence must sound natural in everyday spoken French.
        4. Do not create a too long sentence (1–2 sentences).
        5. Use the number sequence exactly once.
        6. Output ONLY the French sentence. No explanations, no formatting.

        Double-check your output before returning it.
    """

    client = AIClient()

    for attempt in range(1, max_attempts + 1):
        try:
            raw = client.call(prompt)
            response = (raw or "").strip()
            logger.debug(
                "[NUMBERS-ADMIN] Gemini response",
                extra={
                    "attempt": attempt,
                    "number_text": number_text,
                    "blueprint_id": blueprint.id,
                    "response_preview": response[:500],
                },
            )
        except Exception as e:
            logger.warning(
                "[NUMBERS-ADMIN] Gemini call failed",
                exc_info=True,
                extra={
                    "attempt": attempt,
                    "number_text": number_text,
                    "blueprint_id": blueprint.id,
                    "error": str(e),
                },
            )
            continue

        if _is_valid_sentence(response, spoken_chunks):
            return response

        logger.info(
            "[NUMBERS-ADMIN] Gemini sentence rejected by validator",
            extra={
                "attempt": attempt,
                "number_text": number_text,
                "blueprint_id": blueprint.id,
                "response_preview": response[:500],
            },
        )

    raise RuntimeError("Failed to generate a valid sentence after retries")
