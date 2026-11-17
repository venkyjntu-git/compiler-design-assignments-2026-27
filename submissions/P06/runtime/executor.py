from pathlib import Path
import runpy

def execute(path):
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(path)
    runpy.run_path(str(path), run_name="__main__")
