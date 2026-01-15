#!/usr/bin/env python3
"""
Migration script to import existing audio exercises from GitHub into database.

This script reads existing CO/CE practice exercises from the GitHub repository
and creates corresponding records in the coce_exercises table.

Usage:
    uv run python scripts/migrate_coce_exercises.py
"""

import sys
import os
from datetime import datetime

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.shared.coce_practice.repository import GitHubCoCePracticeRepository
from src.shared.coce_practice.exercise_repository import CoCeExerciseRepository
from src.infra.db import db_session
from src.extensions import logger


def migrate_audio_exercises(level: str = "B2", dry_run: bool = False):
    """
    Migrate existing audio exercises from GitHub to database.
    
    Args:
        level: CEFR level to migrate (default: B2)
        dry_run: If True, only print what would be done without making changes
    """
    logger.info(f"Starting migration for level {level} (dry_run={dry_run})")
    
    # Initialize repositories
    github_repo = GitHubCoCePracticeRepository(level=level)
    exercise_repo = CoCeExerciseRepository()
    
    # Fetch exercises from GitHub manifest
    try:
        exercises = github_repo.list_exercises()
        logger.info(f"Found {len(exercises)} exercises in GitHub for level {level}")
    except Exception as e:
        logger.error(f"Failed to fetch manifest from GitHub: {e}")
        return
    
    migrated = 0
    skipped = 0
    errors = 0
    
    for ex in exercises:
        media_id = ex.id  # UUID from GitHub
        
        # Check if already exists in database
        existing = exercise_repo.get_by_media_id(media_id)
        if existing:
            logger.info(f"  ⏭️  Skipping {media_id} - already exists in database")
            skipped += 1
            continue
        
        # Generate file paths
        base_path = f"co-ce-practice/{level}/{media_id}"
        co_path = f"{base_path}/questions_co.json"
        ce_path = f"{base_path}/questions_ce.json"
        transcript_path = f"{base_path}/transcript.json"
        
        # Fetch transcript to get additional metadata
        try:
            transcript = github_repo.fetch_transcript(media_id)
            name = transcript.name
            duration_seconds = transcript.duration_seconds
            logger.info(f"  📥 Fetched transcript for {media_id}: {name}")
        except Exception as e:
            logger.warning(f"  ⚠️  Could not fetch transcript for {media_id}: {e}")
            # Use fallback values
            name = f"Exercise {media_id[:8]}"
            duration_seconds = ex.duration_seconds
        
        if dry_run:
            logger.info(
                f"  [DRY RUN] Would create exercise:\n"
                f"    - Name: {name}\n"
                f"    - Level: {level}\n"
                f"    - Duration: {duration_seconds}s\n"
                f"    - Media ID: {media_id}\n"
                f"    - Media Type: audio\n"
                f"    - CO Path: {co_path}\n"
                f"    - CE Path: {ce_path}\n"
                f"    - Transcript Path: {transcript_path}"
            )
            migrated += 1
            continue
        
        # Create database record
        try:
            exercise = exercise_repo.create_exercise(
                name=name,
                level=level,
                duration_seconds=duration_seconds,
                media_id=media_id,
                media_type="audio",
                co_path=co_path,
                ce_path=ce_path,
                transcript_path=transcript_path,
            )
            logger.info(f"  ✅ Created exercise {exercise.id} for {name}")
            migrated += 1
        except Exception as e:
            logger.error(f"  ❌ Failed to create exercise for {media_id}: {e}")
            errors += 1
    
    # Summary
    logger.info("\n" + "="*60)
    logger.info("Migration Summary:")
    logger.info(f"  Total exercises found: {len(exercises)}")
    logger.info(f"  ✅ Migrated: {migrated}")
    logger.info(f"  ⏭️  Skipped (already exist): {skipped}")
    logger.info(f"  ❌ Errors: {errors}")
    logger.info("="*60)
    
    if dry_run:
        logger.info("\n💡 This was a DRY RUN. No changes were made to the database.")
        logger.info("   Run without --dry-run to apply changes.")


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Migrate existing CO/CE audio exercises from GitHub to database"
    )
    parser.add_argument(
        "--level",
        type=str,
        default="B2",
        choices=["A1", "A2", "B1", "B2", "C1", "C2"],
        help="CEFR level to migrate (default: B2)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be done without making changes"
    )
    parser.add_argument(
        "--all-levels",
        action="store_true",
        help="Migrate all levels (A1-C2)"
    )
    
    args = parser.parse_args()
    
    if args.all_levels:
        levels = ["A1", "A2", "B1", "B2", "C1", "C2"]
        logger.info("Migrating all levels: " + ", ".join(levels))
        for level in levels:
            try:
                migrate_audio_exercises(level=level, dry_run=args.dry_run)
            except Exception as e:
                logger.error(f"Failed to migrate level {level}: {e}")
    else:
        migrate_audio_exercises(level=args.level, dry_run=args.dry_run)
    
    logger.info("\n✨ Migration complete!")


if __name__ == "__main__":
    main()
