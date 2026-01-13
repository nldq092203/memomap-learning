from __future__ import annotations
import os
import sys

from flask_cors import CORS

from loguru import logger

cors = CORS()


def init_logger():
    env = os.getenv("FLASK_ENV", "development")
    logger.remove()
    logger.add(
        sys.stderr,
        level="DEBUG" if env == "development" else "INFO",
        backtrace=True,
        diagnose=env == "development",  # more detail in dev
        enqueue=False,  # safe in multithread/multiprocess
    )
    return logger


logger = init_logger()
