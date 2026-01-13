from src.infra.tts.azure_client import AzureSpeechClient
from xml.sax.saxutils import escape as xml_escape


class TTSService:
    """
    Admin-only TTS service for generating audio bytes.
    """

    def __init__(self):
        self.client = AzureSpeechClient()

    def synthesize(self, text: str, voice: str | None = None) -> bytes:
        """
        Generate audio bytes for the given text.
        NO storage, NO filesystem, NO paths.
        """
        return self.client.synthesize_text(
            text=text,
            voice=voice,
        )

    def synthesize_conversation(
        self,
        turns: list[dict],
        *,
        language: str | None = None,
        break_ms: int = 500,
    ) -> bytes:
        """
        Generate audio for a multi-speaker conversation using SSML.

        Each turn is a dict with:
        - "text": required
        - "voice": optional Azure voice name
        """
        if not turns:
            raise ValueError("turns must be a non-empty list")

        lang_attr = language or "fr-FR"

        parts: list[str] = [f'<speak version="1.0" xml:lang="{lang_attr}">']
        total = len(turns)

        for idx, turn in enumerate(turns):
            text = (turn.get("text") or "").strip()
            if not text:
                continue
            voice = (turn.get("voice") or "").strip()

            escaped_text = xml_escape(text)

            # Add an intra-voice break after all but the last non-empty turn
            segment = escaped_text
            is_last_turn = idx == total - 1
            if break_ms > 0 and not is_last_turn:
                segment += f'<break time="{break_ms}ms"/>'

            if voice:
                parts.append(f'<voice name="{voice}">{segment}</voice>')
            else:
                # Fallback: wrap in <p> to keep <break> out of root <speak>
                parts.append(f"<p>{segment}</p>")

        parts.append("</speak>")
        ssml = "".join(parts)

        return self.client.synthesize_ssml(ssml)
