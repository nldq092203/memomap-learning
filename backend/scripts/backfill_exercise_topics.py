#!/usr/bin/env python3
"""
Backfill script to assign topics to existing CO/CE exercises based on their names.

Usage:
    uv run python scripts/backfill_exercise_topics.py
"""

import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.shared.coce_practice.exercise_repository import CoCeExerciseRepository
from src.extensions import logger


# Mapping of exercise name patterns to topics
TOPIC_MAPPINGS = {
    # Politics
    "Donald Trump": "politics",
    "Groenland": "politics",  # First one about Trump and Greenland
    
    # Geography/Science
    "géologique": "geography",
    
    # Housing
    "poêle": "housing",
    "appartement": "housing",
    
    # Health
    "santé": "health",
    "marche": "health",  # "Lève-toi et marche" is about health/exercise
    
    # Technology
    "IA": "technology",
    
    # Agriculture
    "ferme": "agriculture",
    
    # Transport
    "embouteillé": "transport",
    "trafic": "transport",
    
    # Environment
    "plastiques": "environment",
    "mer": "environment",
    
    # Music/Culture
    "musique": "music",
    
    # Food/Culture
    "repas": "food",
    "gourmandes": "food",
    "Bonnotte": "food",  # Famous potato
    
    # Society/Culture
    "ados": "society",
    "peur": "society",
}


def determine_topic(name: str) -> str | None:
    """Determine the topic based on exercise name."""
    name_lower = name.lower()
    
    # Special case: First Groenland exercise is politics, second is geography
    if "groenland" in name_lower:
        if "trump" in name_lower:
            return "politics"
        elif "géologique" in name_lower:
            return "geography"
    
    
    # Priority checks 
    # Check 'IA' specifically (case sensitive or with boundaries to avoid 'familiale')
    if "IA" in name or "intelligence artificielle" in name_lower:
        return "technology"

    # Check for keyword matches
    for keyword, topic in TOPIC_MAPPINGS.items():
        if keyword.lower() == "ia": continue # Handled above
        
        if keyword.lower() in name_lower:
            return topic
    
    # Default fallback
    return "other"


def backfill_topics(dry_run: bool = True):
    """Backfill topics for all exercises."""
    logger.info(f"Starting topic backfill (dry_run={dry_run})")
    
    repo = CoCeExerciseRepository()
    exercises = repo.get_all()
    
    logger.info(f"Found {len(exercises)} exercises")
    
    updated_count = 0
    skipped_count = 0
    
    for ex in exercises:
        # Skip if already has a topic
        if ex.topic:
            logger.info(f"  ⏭️  Skipping '{ex.name}' - already has topic: {ex.topic}")
            skipped_count += 1
            continue
        
        # Determine topic
        topic = determine_topic(ex.name)
        
        if dry_run:
            logger.info(f"  [DRY RUN] Would set topic for '{ex.name}' to: {topic}")
            updated_count += 1
        else:
            # Update the exercise
            repo.update_exercise(ex.id, topic=topic)
            logger.info(f"  ✅ Updated '{ex.name}' with topic: {topic}")
            updated_count += 1
    
    # Summary
    logger.info("\n" + "="*60)
    logger.info("Backfill Summary:")
    logger.info(f"  Total exercises: {len(exercises)}")
    logger.info(f"  ✅ Updated: {updated_count}")
    logger.info(f"  ⏭️  Skipped (already have topic): {skipped_count}")
    logger.info("="*60)
    
    if dry_run:
        logger.info("\n💡 This was a DRY RUN. No changes were made to the database.")
        logger.info("   Run with --apply to save changes.")


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Backfill topics for CO/CE exercises based on their names"
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply changes to database (default is dry-run)"
    )
    
    args = parser.parse_args()
    
    backfill_topics(dry_run=not args.apply)
    
    if not args.apply:
        logger.info("\n🔄 To apply these changes, run:")
        logger.info("   uv run python scripts/backfill_exercise_topics.py --apply")


if __name__ == "__main__":
    main()
