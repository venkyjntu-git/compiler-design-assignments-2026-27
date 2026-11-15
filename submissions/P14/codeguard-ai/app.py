"""
CodeGuard AI - Flask Web Application Server
Entry point providing RESTful API endpoints for AST parsing, normalization,
similarity analysis, comparison history, and serving the frontend application.
"""

import os
import sys

# Ensure codeguard-ai is in python path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from flask import Flask, request, jsonify, send_from_directory, render_template
from backend.ast_parser import parse_code, ast_to_dict, get_ast_statistics
from backend.normalizer import normalize_ast
from backend.comparator import compare_programs
from backend.database import (
    init_db,
    save_comparison,
    get_history,
    get_comparison_by_id,
    delete_comparison,
    clear_history
)
from sample_codes.samples import SAMPLES

# Initialize Flask app
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
app = Flask(
    __name__,
    static_folder=FRONTEND_DIR,
    static_url_path=""
)

# Configuration & Security limits
app.config["MAX_CONTENT_LENGTH"] = 512 * 1024  # Max 512 KB payload limit
app.config["JSON_SORT_KEYS"] = False

# Initialize SQLite database
init_db()


@app.route("/")
def index():
    """Serves the main application page."""
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/api/samples", methods=["GET"])
def get_sample_cases():
    """Returns the preloaded compiler benchmark test cases."""
    return jsonify({
        "success": True,
        "samples": SAMPLES
    })


@app.route("/api/ast", methods=["POST"])
def generate_ast():
    """
    Parses a single Python program and returns its AST tree and statistics.
    """
    data = request.get_json(silent=True) or {}
    code = data.get("code", "")
    apply_norm = data.get("normalize", False)
    norm_options = data.get("normalization_options", {})

    if not code or not code.strip():
        return jsonify({
            "success": False,
            "error": {
                "error_type": "EmptyInputError",
                "message": "Source code cannot be empty."
            }
        }), 400

    ok, tree, err = parse_code(code)
    if not ok:
        return jsonify({
            "success": False,
            "error": err
        }), 400

    stats = get_ast_statistics(tree, code)

    norm_code = None
    norm_meta = None
    if apply_norm:
        tree, norm_code, norm_meta = normalize_ast(tree, norm_options)

    ast_tree = ast_to_dict(tree)

    return jsonify({
        "success": True,
        "ast_tree": ast_tree,
        "stats": stats,
        "normalized_code": norm_code,
        "normalization_meta": norm_meta
    })


@app.route("/api/compare", methods=["POST"])
def compare():
    """
    Compares two Python programs using the AST similarity pipeline.
    """
    data = request.get_json(silent=True) or {}
    code_a = data.get("code_a", "")
    code_b = data.get("code_b", "")
    name_a = data.get("name_a", "Program A")
    name_b = data.get("name_b", "Program B")
    norm_options = data.get("normalization", {})
    auto_save = data.get("save_to_history", True)

    if not code_a or not code_a.strip():
        return jsonify({
            "success": False,
            "target": "Program A",
            "error": {
                "error_type": "EmptyInputError",
                "message": "Program A is empty. Please provide Python source code."
            }
        }), 400

    if not code_b or not code_b.strip():
        return jsonify({
            "success": False,
            "target": "Program B",
            "error": {
                "error_type": "EmptyInputError",
                "message": "Program B is empty. Please provide Python source code."
            }
        }), 400

    result = compare_programs(code_a, code_b, norm_options)

    if not result.get("success", False):
        return jsonify(result), 400

    # Save to SQLite history
    history_id = None
    if auto_save:
        try:
            history_id = save_comparison(
                program_a_name=name_a,
                program_b_name=name_b,
                comparison_result=result,
                code_a=code_a,
                code_b=code_b
            )
        except Exception as e:
            app.logger.warning(f"History save failed: {e}")

    result["history_id"] = history_id
    result["program_a_name"] = name_a
    result["program_b_name"] = name_b

    return jsonify(result)


@app.route("/api/history", methods=["GET"])
def list_history():
    """Retrieves saved comparison records."""
    limit = request.args.get("limit", default=50, type=int)
    history = get_history(limit=limit)
    return jsonify({
        "success": True,
        "count": len(history),
        "history": history
    })


@app.route("/api/history/<int:comp_id>", methods=["GET"])
def get_history_detail(comp_id: int):
    """Retrieves full details for a single saved report."""
    record = get_comparison_by_id(comp_id)
    if not record:
        return jsonify({
            "success": False,
            "message": f"Comparison record #{comp_id} not found."
        }), 404

    return jsonify({
        "success": True,
        "comparison": record
    })


@app.route("/api/history/<int:comp_id>", methods=["DELETE"])
def delete_history_item(comp_id: int):
    """Deletes a comparison record."""
    deleted = delete_comparison(comp_id)
    if not deleted:
        return jsonify({
            "success": False,
            "message": f"Record #{comp_id} not found."
        }), 404

    return jsonify({
        "success": True,
        "message": f"Comparison #{comp_id} deleted successfully."
    })


@app.route("/api/history", methods=["DELETE"])
def clear_all_history():
    """Clears all history records."""
    count = clear_history()
    return jsonify({
        "success": True,
        "message": f"Cleared {count} comparison records."
    })


@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({
        "success": False,
        "error": {
            "error_type": "PayloadTooLarge",
            "message": "Input source code exceeds the 512KB size limit."
        }
    }), 413


@app.errorhandler(500)
def internal_server_error(error):
    return jsonify({
        "success": False,
        "error": {
            "error_type": "InternalServerError",
            "message": "An unexpected server error occurred during AST processing."
        }
    }), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"================================================================")
    print(f"  CodeGuard AI - AST Clone & Plagiarism Detection Server")
    print(f"  Compiler Design Academic Project")
    print(f"  Running on: http://127.0.0.1:{port}")
    print(f"================================================================")
    app.run(host="127.0.0.1", port=port, debug=True)
