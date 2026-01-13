import sys, traceback
import os
from pathlib import Path

# Ensure vendored dependencies are on the path *before* importing Flask
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "vendor"))

from flask import Flask, jsonify

# Add src directory to Python path so imports like "from extensions import" work
# This is needed because src/__init__.py uses absolute imports
_root = Path(__file__).parent.parent
_src_path = str(_root / "src")
if _src_path not in sys.path:
    sys.path.insert(0, _src_path)

# Pre-create a tiny app so Vercel always sees `app` even if boot fails
app = Flask(__name__)


# Minimal health for debugging even if boot fails
@app.get("/api/health")
def _health_bootstrap():
    return jsonify(ok=True, bootstrap=True), 200


# Store boot error globally so the error endpoint can access it
_boot_error_msg = None

try:
    from src import create_app  # may raise if deps/env missing

    real_app = create_app()  # your real Flask app

    # swap the app object Vercel will use
    app = real_app

except Exception as e:
    # Log full traceback to function logs
    _boot_error_msg = str(e)
    print("Boot error in create_app():", repr(e), file=sys.stderr)
    traceback.print_exc()

    # Expose the error so you can see it
    @app.get("/api/boot_error")
    def _boot_error():
        return jsonify(ok=False, boot_error=_boot_error_msg), 500
