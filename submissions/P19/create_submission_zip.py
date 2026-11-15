"""
Submission Packaging Script for Quantum Circuit Optimizer
Author: Compiler Design - Track E, Problem 19
Packages all project files into a clean zip archive excluding cache and virtual envs.
"""

import os
import zipfile
import shutil

EXCLUDE_DIRS = {"__pycache__", ".venv", "venv", ".git", ".pytest_cache", ".idea", ".vscode"}
EXCLUDE_EXTS = {".pyc", ".pyo", ".pyd"}

def create_zip(source_dir: str, output_zip: str):
    print(f"Creating submission archive: {output_zip}...")
    file_count = 0

    with zipfile.ZipFile(output_zip, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(source_dir):
            # Prune excluded directories in-place
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in EXCLUDE_EXTS or file.endswith(".zip"):
                    continue

                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, os.path.dirname(source_dir))
                zipf.write(full_path, rel_path)
                file_count += 1
                print(f"  + Added: {rel_path}")

    print(f"\nSuccessfully created {output_zip} with {file_count} clean project files.")

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.dirname(current_dir)
    # Save the submission archive outside the project directory to eliminate nested ZIPs
    zip_target = os.path.join(parent_dir, "QuantumCircuitOptimizer_Submission.zip")
    create_zip(current_dir, zip_target)
