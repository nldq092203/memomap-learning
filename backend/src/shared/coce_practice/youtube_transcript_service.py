"""YouTube transcript fetching service using youtube-transcript-api."""

from __future__ import annotations

from datetime import datetime
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    TranscriptsDisabled,
    NoTranscriptFound,
    VideoUnavailable,
)

from src.extensions import logger


class YouTubeTranscriptService:
    """Service to fetch transcripts from YouTube videos."""

    @staticmethod
    def fetch_transcript(
        video_id: str, languages: list[str] | None = None
    ) -> dict[str, str | int]:
        """
        Fetch transcript from YouTube video.

        Args:
            video_id: YouTube video ID (e.g., 'V0RGzDGGts0')
            languages: Preferred languages for transcript (default: ['fr', 'en'])

        Returns:
            Dictionary with transcript data:
            {
                'transcript': str,  # Full transcript text
                'language': str,    # Language code used
                'duration_seconds': int,  # Video duration
                'is_generated': bool,  # Whether transcript is auto-generated
            }
        """
        if languages is None:
            languages = ["fr", "en"]

        logger.info(
            f"[YOUTUBE-TRANSCRIPT] Fetching transcript for video {video_id}, "
            f"languages: {languages}"
        )

        try:
            # Instantiate API (required for this version)
            api = YouTubeTranscriptApi()

            # Get list of available transcripts
            transcript_list = api.list(video_id)

            transcript = None
            is_generated = False
            language_code = None

            # 1. Try manual transcripts in preferred languages
            try:
                transcript = transcript_list.find_manually_created_transcript(languages)
                language_code = transcript.language_code
                is_generated = False
                logger.info(
                    f"[YOUTUBE-TRANSCRIPT] Found manual transcript in {language_code}"
                )
            except NoTranscriptFound:
                # 2. Try generated transcripts in preferred languages
                try:
                    transcript = transcript_list.find_generated_transcript(languages)
                    language_code = transcript.language_code
                    is_generated = True
                    logger.info(
                        f"[YOUTUBE-TRANSCRIPT] Using auto-generated transcript in {language_code}"
                    )
                except NoTranscriptFound:
                    # 3. Try translating ANY available transcript
                    # Get the first available transcript (manual or generated)
                    available = []
                    # _manually_created_transcripts is a dict in some versions, list in others
                    # Let's inspect the object structure safely?
                    # Actually, iterate through all transcripts
                    for t in transcript_list:
                         available.append(t)
                    
                    if available:
                        first_transcript = available[0]
                        # Translate to the first preferred language
                        target_lang = languages[0]
                        transcript = first_transcript.translate(target_lang)
                        language_code = target_lang
                        is_generated = True
                        logger.info(
                            f"[YOUTUBE-TRANSCRIPT] Translated from {first_transcript.language_code} to {language_code}"
                        )
                    else:
                        raise NoTranscriptFound(
                            video_id, languages, "No transcripts available"
                        )

            # Fetch the actual content
            # valid_transcript_obj.fetch() returns a FetchedTranscript object with .snippets
            fetched_transcript = transcript.fetch()

            # Extract text and calculate duration
            full_text_parts = []
            duration_seconds = 0
            
            # Access snippets directly from the object
            if hasattr(fetched_transcript, 'snippets'):
                snippets = fetched_transcript.snippets
                full_text_parts = [s.text for s in snippets]
                
                if snippets:
                    last = snippets[-1]
                    duration_seconds = int(last.start + last.duration)
            else:
                # Fallback if it returns a list (older versions)
                # But our debug showed it returns FetchedTranscript
                full_text_parts = [str(s) for s in fetched_transcript] # Should not happen based on debug

            full_text = " ".join(full_text_parts)

            logger.info(
                f"[YOUTUBE-TRANSCRIPT] Successfully fetched transcript: "
                f"{len(full_text)} chars, {duration_seconds}s"
            )

            return {
                "transcript": full_text,
                "language": language_code,
                "duration_seconds": duration_seconds,
                "is_generated": is_generated,
            }

        except TranscriptsDisabled:
            logger.error(f"[YOUTUBE-TRANSCRIPT] Transcripts disabled for {video_id}")
            raise ValueError(
                f"Transcripts are disabled for video {video_id}. "
                "Please enable subtitles/captions on YouTube."
            )
        except NoTranscriptFound:
            logger.error(
                f"[YOUTUBE-TRANSCRIPT] No transcript found for {video_id} "
                f"in languages {languages}"
            )
            raise ValueError(
                f"No transcript available for video {video_id} in languages {languages}. "
                "Available transcripts might be in different languages."
            )
        except VideoUnavailable:
            logger.error(f"[YOUTUBE-TRANSCRIPT] Video {video_id} unavailable")
            raise ValueError(
                f"Video {video_id} is unavailable, private, or doesn't exist."
            )
        except Exception as e:
            logger.error(f"[YOUTUBE-TRANSCRIPT] Unexpected error: {e}")
            raise ValueError(f"Failed to fetch transcript: {str(e)}")

    @staticmethod
    def format_for_coce(
        video_id: str,
        name: str,
        transcript_text: str,
        language: str,
        duration_seconds: int,
    ) -> dict:
        """
        Format YouTube transcript data for CO/CE exercise transcript.json.

        Args:
            video_id: YouTube video ID
            name: Exercise name
            transcript_text: Full transcript text
            language: Language code
            duration_seconds: Video duration in seconds

        Returns:
            Dictionary matching CoCeTranscript schema
        """
        now = datetime.utcnow().isoformat() + "Z"

        return {
            "id": video_id,
            "created_at": now,
            "updated_at": now,
            "name": name,
            "language": language,
            "duration_seconds": duration_seconds,
            "transcript": transcript_text,
            "audio_filename": f"{video_id}.mp4",  # YouTube video as "audio"
            "audio_mime_type": "video/mp4",
        }


__all__ = ["YouTubeTranscriptService"]
