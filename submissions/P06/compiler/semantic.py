from compiler.attribute_evaluator import evaluate_attribute

def evaluate(tree):
    """Semantic phase: compute the synthesized value attribute."""
    return evaluate_attribute(tree)
