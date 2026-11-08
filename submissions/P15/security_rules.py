from pathlib import Path
import yaml

DEFAULT_RULES = {
    "rules": [
        {"id": "PY001", "name": "Use of eval", "pattern": "eval", "severity": "HIGH",
         "cwe": "CWE-95", "message": "Avoid eval() on potentially untrusted input."},
        {"id": "PY002", "name": "Use of exec", "pattern": "exec", "severity": "HIGH",
         "cwe": "CWE-95", "message": "Avoid exec() on potentially untrusted input."},
        {"id": "PY003", "name": "Shell command with shell=True", "pattern": "shell_true", "severity": "HIGH",
         "cwe": "CWE-78", "message": "Shell execution with shell=True can allow command injection."},
        {"id": "PY004", "name": "Possible hard-coded secret", "pattern": "hardcoded_secret", "severity": "HIGH",
         "cwe": "CWE-798", "message": "Possible credential or secret stored directly in source code."},
        {"id": "PY005", "name": "Weak hash algorithm", "pattern": "weak_hash", "severity": "MEDIUM",
         "cwe": "CWE-328", "message": "MD5 and SHA-1 are not suitable for security-sensitive hashing."},
        {"id": "PY006", "name": "Unsafe pickle deserialization", "pattern": "pickle_loads", "severity": "HIGH",
         "cwe": "CWE-502", "message": "Unpickling untrusted data can execute attacker-controlled code."}
    ]
}

def load_rules(path="rules/security_rules.yaml"):
    path = Path(path)
    if not path.exists():
        return DEFAULT_RULES["rules"]
    with path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle) or {}
    return data.get("rules", [])
