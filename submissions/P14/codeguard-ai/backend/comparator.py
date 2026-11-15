"""
Code Comparator Orchestrator for CodeGuard AI
Coordinates parsing, normalization, multi-metric similarity calculation,
matched region extraction, and narrative summary generation.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from typing import Dict, Any, Optional
from backend.ast_parser import parse_code, ast_to_dict, get_ast_statistics
from backend.normalizer import normalize_ast
from backend.similarity import (
    compute_subtree_similarity,
    compute_node_distribution_similarity,
    compute_structural_sequence_similarity,
    extract_matched_code_regions,
    compute_token_and_text_similarity,
    compute_composite_ast_similarity
)


def generate_comparison_summary(
    composite_score: float,
    category: str,
    text_sim: float,
    token_sim: float,
    subtree_dice: float,
    norm_meta_a: Dict[str, Any],
    norm_meta_b: Dict[str, Any],
    stats_a: Dict[str, Any],
    stats_b: Dict[str, Any]
) -> str:
    """
    Generates a pedagogically rich summary explaining the comparison findings.
    """
    nodes_a = stats_a["total_nodes"]
    nodes_b = stats_b["total_nodes"]
    vars_renamed_a = norm_meta_a.get("total_variables_normalized", 0)
    vars_renamed_b = norm_meta_b.get("total_variables_normalized", 0)

    summary_paragraphs = []

    # Category and core evaluation
    if category == "High structural similarity":
        summary_paragraphs.append(
            f"The two programs exhibit High Structural Similarity ({composite_score}%). "
            f"Their Abstract Syntax Trees share nearly identical hierarchical composition and control-flow graphs."
        )
    elif category == "Moderate structural similarity":
        summary_paragraphs.append(
            f"The two programs exhibit Moderate Structural Similarity ({composite_score}%). "
            f"They share core algorithms or sub-components (such as similar loops or function patterns), "
            f"but contain distinct statements, expressions, or control branches."
        )
    else:
        summary_paragraphs.append(
            f"The two programs exhibit Low Structural Similarity ({composite_score}%). "
            f"Their AST node topologies, syntax structures, and execution paths differ fundamentally."
        )

    # Educational contrast between Text similarity and AST similarity
    diff_text_ast = composite_score - text_sim
    if diff_text_ast > 20:
        summary_paragraphs.append(
            f"Significant Divergence Detected: Raw text similarity is {text_sim}%, while AST structural "
            f"similarity is {composite_score}%. This illustrates a classic Type-2 code clone: the code has "
            f"been obfuscated or styled differently (renamed variables, reformatting, or comments), yet the "
            f"underlying syntax trees and compiler instruction flows are structurally congruent."
        )
    elif abs(diff_text_ast) <= 10 and composite_score >= 90:
        summary_paragraphs.append(
            f"Both text similarity ({text_sim}%) and AST structural similarity ({composite_score}%) are high, "
            f"characterizing an exact or near-identical Type-1 clone."
        )

    # Normalization impact note
    renamed_total = vars_renamed_a + vars_renamed_b
    if renamed_total > 0:
        summary_paragraphs.append(
            f"AST Normalization successfully canonicalized {vars_renamed_a} identifiers in Program A and "
            f"{vars_renamed_b} identifiers in Program B, allowing structural comparison independent of variable naming."
        )

    summary_paragraphs.append(
        f"Structural Profile: Program A contains {nodes_a} AST nodes (depth {stats_a['max_depth']}, complexity {stats_a['cyclomatic_complexity']}), "
        f"while Program B contains {nodes_b} AST nodes (depth {stats_b['max_depth']}, complexity {stats_b['cyclomatic_complexity']})."
    )

    return " ".join(summary_paragraphs)


def compare_programs(
    code_a: str,
    code_b: str,
    normalization_options: Optional[Dict[str, bool]] = None
) -> Dict[str, Any]:
    """
    Executes the complete AST comparison pipeline on two source code strings.
    """
    # Stage 1: Parse code A
    ok_a, tree_a, err_a = parse_code(code_a)
    if not ok_a:
        return {
            "success": False,
            "target": "Program A",
            "error": err_a
        }

    # Stage 1: Parse code B
    ok_b, tree_b, err_b = parse_code(code_b)
    if not ok_b:
        return {
            "success": False,
            "target": "Program B",
            "error": err_b
        }

    # Stage 2: Gather raw AST statistics
    stats_a = get_ast_statistics(tree_a, code_a)
    stats_b = get_ast_statistics(tree_b, code_b)

    # Stage 3: Normalize ASTs according to options
    norm_tree_a, norm_code_a, norm_meta_a = normalize_ast(tree_a, normalization_options)
    norm_tree_b, norm_code_b, norm_meta_b = normalize_ast(tree_b, normalization_options)

    # Stage 4: Similarity calculations
    subtree_sim = compute_subtree_similarity(norm_tree_a, norm_tree_b)
    node_dist_sim = compute_node_distribution_similarity(norm_tree_a, norm_tree_b)
    seq_sim = compute_structural_sequence_similarity(norm_tree_a, norm_tree_b)
    token_text_sim = compute_token_and_text_similarity(code_a, code_b)

    # Stage 5: Composite score and classification
    composite_score, category, formula_details = compute_composite_ast_similarity(
        subtree_sim, node_dist_sim, seq_sim
    )

    # Stage 6: Matched code regions for side-by-side highlighting
    matched_regions = extract_matched_code_regions(
        subtree_sim["subtrees_a_raw"],
        subtree_sim["subtrees_b_raw"]
    )

    # Collect matched node IDs for tree visualizer
    matched_sigs = {
        sig for sig, _ in subtree_sim["subtrees_a_raw"]
        if sig in {s for s, _ in subtree_sim["subtrees_b_raw"]}
    }

    # Convert trees to visual dict structures
    ast_dict_a = ast_to_dict(tree_a)
    ast_dict_b = ast_to_dict(tree_b)

    # Stage 7: Pedagogical summary
    summary = generate_comparison_summary(
        composite_score,
        category,
        token_text_sim["text_similarity"],
        token_text_sim["token_similarity"],
        subtree_sim["dice_similarity"],
        norm_meta_a,
        norm_meta_b,
        stats_a,
        stats_b
    )

    return {
        "success": True,
        "metrics": {
            "ast_similarity": composite_score,
            "similarity_category": category,
            "token_similarity": token_text_sim["token_similarity"],
            "text_similarity": token_text_sim["text_similarity"],
            "token_jaccard": token_text_sim["token_jaccard"],
            "subtree_jaccard": subtree_sim["jaccard_similarity"],
            "subtree_dice": subtree_sim["dice_similarity"],
            "node_distribution_cosine": node_dist_sim["cosine_similarity"],
            "sequence_similarity": seq_sim["sequence_similarity"],
            "containment_a_in_b": subtree_sim["containment_a_in_b"],
            "containment_b_in_a": subtree_sim["containment_b_in_a"],
        },
        "stats_a": stats_a,
        "stats_b": stats_b,
        "matched_node_types": node_dist_sim["matched_node_types"],
        "unmatched_node_types": node_dist_sim["unmatched_node_types"],
        "matched_regions": matched_regions,
        "summary": summary,
        "formula_details": formula_details,
        "normalization": {
            "options": norm_meta_a["options_applied"],
            "program_a_meta": norm_meta_a,
            "program_b_meta": norm_meta_b,
            "normalized_code_a": norm_code_a,
            "normalized_code_b": norm_code_b
        },
        "ast_trees": {
            "tree_a": ast_dict_a,
            "tree_b": ast_dict_b
        },
        "disclaimer": (
            "Educational Code-Similarity Notice: CodeGuard AI evaluates syntactic and AST structural "
            "similarities. A high percentage indicates structural congruence (such as common algorithmic "
            "skeletons or patterns), not definitive evidence of intentional plagiarism. Human review "
            "and pedagogical context are required."
        )
    }


if __name__ == "__main__":
    print("=" * 70)
    print("CodeGuard AI - End-to-End Pipeline Comparator")
    print("=" * 70)
    p1 = "def add(a, b):\n    return a + b"
    p2 = "def sum_vals(x, y):\n    return x + y"
    res = compare_programs(p1, p2)
    m = res["metrics"]
    print(f"Program A:\n{p1}\n")
    print(f"Program B:\n{p2}\n")
    print(f"Calculated AST Similarity:  {m['ast_similarity']}% ({m['similarity_category']})")
    print(f"Subtree Dice Metric:        {m['subtree_dice']}%")
    print(f"Sequence Alignment:         {m['sequence_similarity']}%")
    print(f"Raw Text Similarity:        {m['text_similarity']}%")
    print(f"Token Similarity:           {m['token_similarity']}%")
    print(f"\nSummary:\n{res['summary']}")
    print("=" * 70)

