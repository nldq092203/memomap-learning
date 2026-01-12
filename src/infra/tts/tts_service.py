from src.infra.tts.azure_client import AzureSpeechClient


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
