# Architecture

The analyzer parses source files into Python ASTs. Pattern detection checks calls and assignments against YAML-configured rules. Taint analysis tracks a limited set of tainted variable assignments within a file and reports when tainted names reach selected sink calls. The report generator serializes findings as text, JSON or SARIF.
