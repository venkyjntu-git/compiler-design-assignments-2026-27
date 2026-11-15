def compute_fibonacci(n):
    if n <= 0:
        return []
    if n == 1:
        return [0]
    fib = [0, 1]
    for i in range(2, n):
        next_val = fib[i - 1] + fib[i - 2]
        fib.append(next_val)
    return fib

series = compute_fibonacci(10)
print(series)
