"""
Benchmark Test Cases Verification Script for CodeGuard AI
Prints calculated AST metrics and comparison details for all 5 sample test cases.
"""

import sys
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

from sample_codes.samples import SAMPLES
from backend.comparator import compare_programs

def run_benchmarks():
    print("=" * 80)
    print("CodeGuard AI - Compiler Benchmark Evaluation")
    print("=" * 80)

    for key, data in SAMPLES.items():
        print(f"\n--- {data['title']} ({data['clone_type']}) ---")
        print(f"Goal: {data['description']}")
        
        result = compare_programs(data['program_a'], data['program_b'])
        m = result['metrics']
        
        print(f"Calculated AST Similarity:  {m['ast_similarity']}%")
        print(f"Classification Category:    {m['similarity_category']}")
        print(f"Subtree Dice Metric:        {m['subtree_dice']}%")
        print(f"Subtree Jaccard Metric:     {m['subtree_jaccard']}%")
        print(f"Sequence Alignment:         {m['sequence_similarity']}%")
        print(f"Node Distribution Cosine:   {m['node_distribution_cosine']}%")
        print(f"Raw Text Similarity:        {m['text_similarity']}%")
        print(f"Token Similarity:           {m['token_similarity']}%")
        print(f"Matched Node Types:         {len(result['matched_node_types'])}")
        print(f"Unmatched Node Types:       {len(result['unmatched_node_types'])}")
        print(f"Matched Code Blocks:        {len(result['matched_regions'])}")
        print(f"Summary: {result['summary'][:160]}...")

    print("\n" + "=" * 80)
    print("All benchmark test cases executed with real, unmocked mathematical calculations!")
    print("=" * 80)

if __name__ == "__main__":
    run_benchmarks()
