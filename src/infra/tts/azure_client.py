import os
import azure.cognitiveservices.speech as speechsdk


class AzureSpeechClient:
    """
    Low-level Azure Text-to-Speech client.
    Returns raw audio bytes.
    """

    def __init__(self):
        key = os.getenv("AZURE_SPEECH_KEY")
        region = os.getenv("AZURE_SPEECH_REGION")

        if not key or not region:
            raise RuntimeError("Azure Speech credentials are missing")

        self.speech_config = speechsdk.SpeechConfig(
            subscription=key,
            region=region,
        )

        # Recommended French voice
        self.speech_config.speech_synthesis_voice_name = "fr-FR-DeniseNeural"

        # Output format: MP3
        self.speech_config.set_speech_synthesis_output_format(
            speechsdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3
        )

    def synthesize_text(self, text: str, voice: str | None = None) -> bytes:
        if voice:
            self.speech_config.speech_synthesis_voice_name = voice

        synthesizer = speechsdk.SpeechSynthesizer(
            speech_config=self.speech_config,
            audio_config=None,
        )

        result = synthesizer.speak_text_async(text).get()

        if result.reason != speechsdk.ResultReason.SynthesizingAudioCompleted:
            raise RuntimeError(f"TTS failed: {result.reason}")

        return result.audio_data
