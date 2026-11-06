import sys

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


def read_grammar():
    print("Enter your grammar.")
    print("Example: E -> E + T | T")
    print("Type END when finished.\n")


    grammar = {}

    while True:
        line = input("Production: ").strip()

        if line.upper() == "END":
            break

        if "->" in line:
            left, right = line.split("->", 1)
        elif "→" in line:
            left, right = line.split("→", 1)
        else:
            print("Invalid rule! Use -> or →")
            continue

        left = left.strip()

        if not left:
            print("Missing left-hand side!")
            continue

        alternatives = right.split("|")
        grammar.setdefault(left, [])

        for alternative in alternatives:
            raw_symbols = alternative.strip().split()

            if not raw_symbols or raw_symbols == ["ε"] or raw_symbols == ["epsilon"]:
                symbols = []
            else:
                symbols = raw_symbols

            grammar[left].append(symbols)

    return grammar


def main():
    grammar = read_grammar()

    if not grammar:
        print("No valid productions entered.")
        return

    nonterminals = set(grammar.keys())
    terminals = set()

    for productions in grammar.values():
        for production in productions:
            for symbol in production:
                if symbol not in nonterminals:
                    terminals.add(symbol)

    print("\n--- Grammar Analysis ---")
    print("Start symbol:", next(iter(grammar)))
    print("Nonterminals:", sorted(nonterminals))
    print("Terminals:", sorted(terminals))

    print("\nProductions:")
    for left, productions in grammar.items():
        for production in productions:
            print(left, "->", " ".join(production) if production else "ε")


if __name__ == "__main__":
    main()