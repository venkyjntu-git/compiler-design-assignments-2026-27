"""
SQLite Database Layer for CodeGuard AI
Manages persistent storage of comparison reports, history retrieval,
and record lifecycle.
"""

import sqlite3
import json
import os
from datetime import datetime
from typing import Dict, Any, List, Optional

DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "codeguard.db")


def get_connection(db_path: Optional[str] = None) -> sqlite3.Connection:
    path = db_path or DB_FILE
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path: Optional[str] = None):
    """Initializes the SQLite schema if it doesn't already exist."""
    conn = get_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS comparisons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            program_a_name TEXT NOT NULL,
            program_b_name TEXT NOT NULL,
            ast_similarity REAL NOT NULL,
            token_similarity REAL NOT NULL,
            text_similarity REAL NOT NULL,
            similarity_category TEXT NOT NULL,
            normalization_settings TEXT,
            nodes_a INTEGER,
            nodes_b INTEGER,
            summary TEXT,
            program_a_snippet TEXT,
            program_b_snippet TEXT,
            details_json TEXT
        )
    """)
    conn.commit()
    conn.close()


def save_comparison(
    program_a_name: str,
    program_b_name: str,
    comparison_result: Dict[str, Any],
    code_a: str,
    code_b: str,
    db_path: Optional[str] = None
) -> int:
    """
    Saves a comparison report into the SQLite database.
    Truncates code snippets for storage efficiency and stores metrics and details.
    """
    init_db(db_path)
    conn = get_connection(db_path)
    cursor = conn.cursor()

    metrics = comparison_result.get("metrics", {})
    stats_a = comparison_result.get("stats_a", {})
    stats_b = comparison_result.get("stats_b", {})
    norm = comparison_result.get("normalization", {})

    # Create safe snippets (first 500 chars)
    snippet_a = code_a[:500] + ("..." if len(code_a) > 500 else "")
    snippet_b = code_b[:500] + ("..." if len(code_b) > 500 else "")

    now_iso = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Serialize detailed results (omitting giant tree copies to keep DB light and fast)
    lightweight_details = {
        "metrics": metrics,
        "stats_a": stats_a,
        "stats_b": stats_b,
        "matched_node_types": comparison_result.get("matched_node_types", []),
        "unmatched_node_types": comparison_result.get("unmatched_node_types", []),
        "matched_regions": comparison_result.get("matched_regions", []),
        "summary": comparison_result.get("summary", ""),
        "formula_details": comparison_result.get("formula_details", {}),
        "disclaimer": comparison_result.get("disclaimer", "")
    }

    cursor.execute("""
        INSERT INTO comparisons (
            timestamp, program_a_name, program_b_name,
            ast_similarity, token_similarity, text_similarity,
            similarity_category, normalization_settings,
            nodes_a, nodes_b, summary,
            program_a_snippet, program_b_snippet, details_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        now_iso,
        program_a_name or "Program A",
        program_b_name or "Program B",
        metrics.get("ast_similarity", 0.0),
        metrics.get("token_similarity", 0.0),
        metrics.get("text_similarity", 0.0),
        metrics.get("similarity_category", "Unknown"),
        json.dumps(norm.get("options", {})),
        stats_a.get("total_nodes", 0),
        stats_b.get("total_nodes", 0),
        comparison_result.get("summary", ""),
        snippet_a,
        snippet_b,
        json.dumps(lightweight_details)
    ))

    inserted_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return inserted_id or 0


def get_history(limit: int = 50, db_path: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieves list of past comparison reports sorted by newest first."""
    init_db(db_path)
    conn = get_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, timestamp, program_a_name, program_b_name,
               ast_similarity, token_similarity, text_similarity,
               similarity_category, nodes_a, nodes_b, summary
        FROM comparisons
        ORDER BY id DESC
        LIMIT ?
    """, (limit,))

    rows = cursor.fetchall()
    history = [dict(row) for row in rows]
    conn.close()
    return history


def get_comparison_by_id(comp_id: int, db_path: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Fetches full details of a specific comparison report."""
    init_db(db_path)
    conn = get_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM comparisons WHERE id = ?", (comp_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    data = dict(row)
    if data.get("details_json"):
        try:
            data["details"] = json.loads(data["details_json"])
        except Exception:
            data["details"] = {}
    if data.get("normalization_settings"):
        try:
            data["normalization_settings"] = json.loads(data["normalization_settings"])
        except Exception:
            data["normalization_settings"] = {}

    return data


def delete_comparison(comp_id: int, db_path: Optional[str] = None) -> bool:
    """Deletes a comparison record by ID."""
    init_db(db_path)
    conn = get_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("DELETE FROM comparisons WHERE id = ?", (comp_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted


def clear_history(db_path: Optional[str] = None) -> int:
    """Clears all comparison records."""
    init_db(db_path)
    conn = get_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("DELETE FROM comparisons")
    count = cursor.rowcount
    conn.commit()
    conn.close()
    return count
