"""
Educational Fibonacci Computation Module
Calculates the first N terms of the Fibonacci sequence.
"""

def compute_fibonacci(n):
    # Edge case: non-positive input check
    if n <= 0:
        return []

    # Base case for n = 1
    if n == 1:
        return [0]

    # Initialize seed values in accumulator list
    fib = [0, 1]

    # Iteratively generate remaining sequence values
    for i in range(2, n):
        # Calculate sum of previous two elements
        next_val = fib[i - 1] + fib[i - 2]
        fib.append(next_val)  # Append next term

    return fib



# Main entry execution block
series = compute_fibonacci(10)
print(series)
