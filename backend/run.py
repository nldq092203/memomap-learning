import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
print(BASE_DIR)
SRC_DIR = os.path.join(BASE_DIR, "src")
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from src import create_app

flask_app = create_app()


def main():
    """Entry point for running the Flask development server."""
    flask_app.run(debug=True)


if __name__ == "__main__":
    main()
