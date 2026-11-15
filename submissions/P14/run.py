"""
CodeGuard AI - Entry Point Launcher
Launches the Flask Web Application on http://127.0.0.1:5000
"""

import sys
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CODEGUARD_DIR = os.path.join(BASE_DIR, "codeguard-ai")

if os.path.exists(CODEGUARD_DIR):
    sys.path.insert(0, CODEGUARD_DIR)
    from app import app
else:
    sys.path.insert(0, BASE_DIR)
    from app import app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print("=" * 65)
    print("  CodeGuard AI - AST Clone & Plagiarism Detection System")
    print("  Compiler Design Academic Project")
    print(f"  Access the web interface at: http://127.0.0.1:{port}")
    print("=" * 65)
    app.run(host="127.0.0.1", port=port, debug=True)
