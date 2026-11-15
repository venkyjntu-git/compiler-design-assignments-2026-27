"""
AST Similarity Analysis Module for CodeGuard AI
Implements mathematically grounded tree similarity algorithms:
- Subtree Decomposition and Multiset Jaccard / Dice similarity
- AST Node Type Vector Cosine & Jaccard Similarity
- Structural Pre-order Sequence Alignment Similarity
- Token-based & Text-based supporting metrics
- AST Node-to-Line structural mapping for side-by-side highlighting
"""

import ast
import io
import math
import tokenize
import difflib
from collections import Counter
from typing import Dict, Any, List, Tuple, Set, Optional


def extract_node_semantic_id(node: ast.AST) -> str:
    """Extracts the semantic identifier or operator tag for structural signature."""
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.FunctionDef):
        return node.name
    if isinstance(node, ast.AsyncFunctionDef):
        return node.name
    if isinstance(node, ast.arg):
        return node.arg
    if isinstance(node, ast.BinOp):
        return node.op.__class__.__name__
    if isinstance(node, ast.UnaryOp):
        return node.op.__class__.__name__
    if isinstance(node, ast.Compare):
        return "-".join(op.__class__.__name__ for op in node.ops)
    if isinstance(node, ast.Call):
        if isinstance(node.func, ast.Name):
            return f"call:{node.func.id}"
        elif isinstance(node.func, ast.Attribute):
            return f"call:{node.func.attr}"
        return "call"
    if isinstance(node, ast.Attribute):
        return f"attr:{node.attr}"
    if isinstance(node, ast.Constant):
        val = node.value
        if isinstance(val, (int, float, bool)):
            return f"num:{val}"
        elif isinstance(val, str):
            short = val[:10].replace("\n", " ")
            return f"str:{short}"
        return type(val).__name__
    return ""


def get_subtree_signatures(
    node: ast.AST,
    max_depth: int = 10
) -> Tuple[str, List[Tuple[str, ast.AST]]]:
    """
    Recursively generates structural signatures for all subtrees rooted at node.
    Includes node types, operators, and normalized identifiers.
    Returns:
        (root_signature, list_of_(signature, ast_node))
    """
    node_name = node.__class__.__name__
    sem_id = extract_node_semantic_id(node)

    child_sigs: List[str] = []
    subtree_list: List[Tuple[str, ast.AST]] = []

    if max_depth > 0:
        for _, child in ast.iter_fields(node):
            if isinstance(child, ast.AST):
                c_sig, c_subtrees = get_subtree_signatures(child, max_depth - 1)
                child_sigs.append(c_sig)
                subtree_list.extend(c_subtrees)
            elif isinstance(child, list):
                for item in child:
                    if isinstance(item, ast.AST):
                        c_sig, c_subtrees = get_subtree_signatures(item, max_depth - 1)
                        child_sigs.append(c_sig)
                        subtree_list.extend(c_subtrees)

    tag = f"[{sem_id}]" if sem_id else ""
    composite = f"{node_name}{tag}({';'.join(child_sigs)})"
    subtree_list.append((composite, node))

    return composite, subtree_list


def compute_subtree_similarity(
    tree_a: ast.AST,
    tree_b: ast.AST
) -> Dict[str, Any]:
    """
    Computes Multiset Jaccard and Dice similarity on AST subtree signatures.
    """
    _, subtrees_a = get_subtree_signatures(tree_a)
    _, subtrees_b = get_subtree_signatures(tree_b)

    sigs_a = [sig for sig, _ in subtrees_a]
    sigs_b = [sig for sig, _ in subtrees_b]

    count_a = Counter(sigs_a)
    count_b = Counter(sigs_b)

    all_keys = set(count_a.keys()).union(set(count_b.keys()))

    intersection_count = sum(min(count_a[k], count_b[k]) for k in all_keys)
    union_count = sum(max(count_a[k], count_b[k]) for k in all_keys)
    total_a = len(sigs_a)
    total_b = len(sigs_b)

    jaccard = (intersection_count / union_count) if union_count > 0 else 1.0
    dice = (2.0 * intersection_count / (total_a + total_b)) if (total_a + total_b) > 0 else 1.0

    containment_a_in_b = (intersection_count / total_a) if total_a > 0 else 1.0
    containment_b_in_a = (intersection_count / total_b) if total_b > 0 else 1.0

    return {
        "jaccard_similarity": round(jaccard * 100, 2),
        "dice_similarity": round(dice * 100, 2),
        "containment_a_in_b": round(containment_a_in_b * 100, 2),
        "containment_b_in_a": round(containment_b_in_a * 100, 2),
        "matched_subtrees_count": intersection_count,
        "total_subtrees_a": total_a,
        "total_subtrees_b": total_b,
        "subtrees_a_raw": subtrees_a,
        "subtrees_b_raw": subtrees_b
    }


def compute_node_distribution_similarity(
    tree_a: ast.AST,
    tree_b: ast.AST
) -> Dict[str, Any]:
    """
    Computes node type distribution similarity using multiset Jaccard and vector cosine.
    """
    def collect_node_types(t: ast.AST) -> Counter:
        c = Counter()
        for node in ast.walk(t):
            c[node.__class__.__name__] += 1
        return c

    counts_a = collect_node_types(tree_a)
    counts_b = collect_node_types(tree_b)

    all_types = sorted(list(set(counts_a.keys()).union(set(counts_b.keys()))))

    # Multiset Jaccard on node types
    inter_count = sum(min(counts_a[t], counts_b[t]) for t in all_types)
    union_count = sum(max(counts_a[t], counts_b[t]) for t in all_types)
    type_jaccard = (inter_count / union_count) if union_count > 0 else 1.0

    # Vector Cosine
    dot_product = sum(counts_a[t] * counts_b[t] for t in all_types)
    norm_a = math.sqrt(sum(counts_a[t] ** 2 for t in all_types))
    norm_b = math.sqrt(sum(counts_b[t] ** 2 for t in all_types))

    if norm_a == 0 or norm_b == 0:
        cosine_sim = 1.0 if norm_a == norm_b else 0.0
    else:
        cosine_sim = dot_product / (norm_a * norm_b)

    matched_types = []
    unmatched_types = []

    for t in all_types:
        ca = counts_a.get(t, 0)
        cb = counts_b.get(t, 0)
        if ca > 0 and cb > 0:
            matched_types.append({
                "type": t,
                "count_a": ca,
                "count_b": cb,
                "difference": abs(ca - cb)
            })
        else:
            unmatched_types.append({
                "type": t,
                "count_a": ca,
                "count_b": cb,
                "present_in": "Program A" if ca > 0 else "Program B"
            })

    matched_types.sort(key=lambda x: -(x["count_a"] + x["count_b"]))
    unmatched_types.sort(key=lambda x: -(x["count_a"] + x["count_b"]))

    return {
        "cosine_similarity": round(cosine_sim * 100, 2),
        "type_jaccard": round(type_jaccard * 100, 2),
        "matched_node_types": matched_types,
        "unmatched_node_types": unmatched_types,
        "total_unique_types": len(all_types),
        "common_types_count": len(matched_types)
    }


def compute_structural_sequence_similarity(
    tree_a: ast.AST,
    tree_b: ast.AST
) -> Dict[str, Any]:
    """
    Serializes AST into pre-order structural token sequence and computes
    sequence alignment similarity via Gestalt Pattern Matching.
    """
    def linearize_tree(t: ast.AST) -> List[str]:
        seq = []
        for node in ast.walk(t):
            token = node.__class__.__name__
            sem_id = extract_node_semantic_id(node)
            if sem_id:
                token += f":{sem_id}"
            seq.append(token)
        return seq

    seq_a = linearize_tree(tree_a)
    seq_b = linearize_tree(tree_b)

    matcher = difflib.SequenceMatcher(None, seq_a, seq_b)
    ratio = matcher.ratio()

    return {
        "sequence_similarity": round(ratio * 100, 2),
        "sequence_length_a": len(seq_a),
        "sequence_length_b": len(seq_b)
    }


def extract_matched_code_regions(
    subtrees_a_raw: List[Tuple[str, ast.AST]],
    subtrees_b_raw: List[Tuple[str, ast.AST]]
) -> List[Dict[str, Any]]:
    """
    Finds structural AST subtrees that match between Program A and Program B
    and extracts their source code line intervals for side-by-side highlighting.
    """
    b_map: Dict[str, List[ast.AST]] = {}
    for sig, node in subtrees_b_raw:
        if node.__class__.__name__ in ("Name", "Constant", "Load", "Store", "arg", "Pass"):
            continue
        b_map.setdefault(sig, []).append(node)

    matched_regions = []
    seen_ranges_a = set()

    for sig, node_a in subtrees_a_raw:
        if node_a.__class__.__name__ in ("Name", "Constant", "Load", "Store", "arg", "Pass"):
            continue

        if sig in b_map and b_map[sig]:
            node_b = b_map[sig][0]

            line_a_start = getattr(node_a, "lineno", None)
            line_a_end = getattr(node_a, "end_lineno", line_a_start)
            line_b_start = getattr(node_b, "lineno", None)
            line_b_end = getattr(node_b, "end_lineno", line_b_start)

            if line_a_start and line_b_start:
                span_key = (line_a_start, line_a_end)
                if span_key not in seen_ranges_a:
                    seen_ranges_a.add(span_key)
                    matched_regions.append({
                        "node_type": node_a.__class__.__name__,
                        "lines_a": [line_a_start, line_a_end],
                        "lines_b": [line_b_start, line_b_end],
                        "description": f"Structural match: {node_a.__class__.__name__} block (Lines A: {line_a_start}-{line_a_end} <-> Lines B: {line_b_start}-{line_b_end})"
                    })

    matched_regions.sort(key=lambda r: r["lines_a"][0])
    return matched_regions[:25]


def compute_token_and_text_similarity(code_a: str, code_b: str) -> Dict[str, Any]:
    """
    Tokenizes both source files and computes token-based and raw text similarities.
    """
    clean_a = code_a.replace("\r\n", "\n").replace("\r", "\n")
    clean_b = code_b.replace("\r\n", "\n").replace("\r", "\n")

    text_matcher = difflib.SequenceMatcher(None, clean_a.splitlines(), clean_b.splitlines())
    text_similarity = round(text_matcher.ratio() * 100, 2)

    def extract_tokens(source: str) -> List[str]:
        tokens = []
        try:
            reader = io.StringIO(source).readline
            for tok in tokenize.generate_tokens(reader):
                if tok.type not in (tokenize.COMMENT, tokenize.ENCODING, tokenize.NL, tokenize.NEWLINE):
                    tokens.append(f"{tokenize.tok_name[tok.type]}:{tok.string.strip()}")
        except Exception:
            tokens = source.split()
        return tokens

    tokens_a = extract_tokens(clean_a)
    tokens_b = extract_tokens(clean_b)

    token_matcher = difflib.SequenceMatcher(None, tokens_a, tokens_b)
    token_similarity = round(token_matcher.ratio() * 100, 2)

    c_a = Counter(tokens_a)
    c_b = Counter(tokens_b)
    tok_keys = set(c_a.keys()).union(set(c_b.keys()))
    inter = sum(min(c_a[k], c_b[k]) for k in tok_keys)
    union = sum(max(c_a[k], c_b[k]) for k in tok_keys)
    token_jaccard = round((inter / union * 100) if union > 0 else 100.0, 2)

    return {
        "text_similarity": text_similarity,
        "token_similarity": token_similarity,
        "token_jaccard": token_jaccard,
        "token_count_a": len(tokens_a),
        "token_count_b": len(tokens_b)
    }


def compute_composite_ast_similarity(
    subtree_sim: Dict[str, Any],
    node_dist_sim: Dict[str, Any],
    seq_sim: Dict[str, Any]
) -> Tuple[float, str, Dict[str, Any]]:
    """
    Calculates the composite AST structural similarity score
    using weighted combination of Subtree Dice, Sequence Alignment, and Node Distribution Jaccard.

    Formula:
        Overall AST Similarity = 0.55 * Subtree_Dice + 0.30 * Sequence_Sim + 0.15 * Node_Type_Jaccard
    """
    w_dice = 0.55
    w_seq = 0.30
    w_dist = 0.15

    s_dice = subtree_sim["dice_similarity"]
    s_seq = seq_sim["sequence_similarity"]
    s_dist = node_dist_sim["type_jaccard"]

    composite = (w_dice * s_dice) + (w_seq * s_seq) + (w_dist * s_dist)
    composite = max(0.0, min(100.0, round(composite, 2)))

    if composite >= 80.0:
        category = "High structural similarity"
    elif composite >= 50.0:
        category = "Moderate structural similarity"
    else:
        category = "Low structural similarity"

    weights_breakdown = {
        "formula": "0.55 * Subtree_Dice + 0.30 * Sequence_Alignment + 0.15 * Node_Type_Jaccard",
        "weights": {
            "subtree_dice_weight": w_dice,
            "sequence_alignment_weight": w_seq,
            "node_type_jaccard_weight": w_dist
        },
        "components": {
            "subtree_dice": s_dice,
            "subtree_jaccard": subtree_sim["jaccard_similarity"],
            "sequence_alignment": s_seq,
            "node_type_jaccard": s_dist,
            "node_distribution_cosine": node_dist_sim["cosine_similarity"]
        }
    }

    return composite, category, weights_breakdown


if __name__ == "__main__":
    print("=" * 70)
    print("CodeGuard AI - AST Similarity Engine Standalone Execution")
    print("=" * 70)
    p1 = "def add(a, b):\n    return a + b"
    p2 = "def sum_vals(x, y):\n    return x + y"
    tree1 = ast.parse(p1)
    tree2 = ast.parse(p2)
    sub_sim = compute_subtree_similarity(tree1, tree2)
    dist_sim = compute_node_distribution_similarity(tree1, tree2)
    seq_sim = compute_structural_sequence_similarity(tree1, tree2)
    overall, cat, weights = compute_composite_ast_similarity(sub_sim, dist_sim, seq_sim)
    print(f"Program 1: {repr(p1)}")
    print(f"Program 2: {repr(p2)}")
    print(f"\nCalculated AST Similarity:  {overall}%")
    print(f"Classification Category:    {cat}")
    print(f"Subtree Dice Metric:        {sub_sim['dice_similarity']}%")
    print(f"Sequence Alignment:         {seq_sim['sequence_similarity']}%")
    print(f"Node Type Jaccard:          {dist_sim['type_jaccard']}%")
    print(f"Node Distribution Cosine:   {dist_sim['cosine_similarity']}%")
    print("=" * 70)

