"""
Sample Test Cases for CodeGuard AI
Contains 5 representative test cases demonstrating compiler AST behavior across
different clone types:
1. Identical Programs (Type-1 Exact)
2. Whitespace and Comments Difference (Type-1 Trivia Invariance)
3. Renamed Variables and Functions (Type-2 Identifier Obfuscation)
4. Modified Statements & Refactoring (Type-3 Near-Miss)
5. Completely Different Logic (Unrelated Algorithms)
"""

SAMPLES = {
    "case1_identical": {
        "title": "Case 1: Identical Programs",
        "clone_type": "Type-1 Exact Clone",
        "description": "Two identical implementations of Binary Search. Tests baseline consistency where both AST and raw text should achieve 100% similarity.",
        "program_a_name": "binary_search_a.py",
        "program_b_name": "binary_search_b.py",
        "program_a": '''def binary_search(arr, target):
    low = 0
    high = len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1

numbers = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
result = binary_search(numbers, 23)
print("Index:", result)
''',
        "program_b": '''def binary_search(arr, target):
    low = 0
    high = len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1

numbers = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
result = binary_search(numbers, 23)
print("Index:", result)
'''
    },
    "case2_whitespace_comments": {
        "title": "Case 2: Whitespace and Comments",
        "clone_type": "Type-1 Trivia Invariant Clone",
        "description": "Program B includes verbose docstrings, block comments, inline commentary, and irregular spacing. Demonstrates how AST parser eliminates all lexical trivia while text comparison drops.",
        "program_a_name": "fibonacci_clean.py",
        "program_b_name": "fibonacci_commented.py",
        "program_a": '''def compute_fibonacci(n):
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
''',
        "program_b": '''"""
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
'''
    },
    "case3_renamed_variables": {
        "title": "Case 3: Renamed Variables & Functions",
        "clone_type": "Type-2 Renamed Clone",
        "description": "Bubble Sort with identical algorithmic steps, but all identifier and function names are renamed. Demonstrates AST identifier normalization in action.",
        "program_a_name": "bubble_sort_standard.py",
        "program_b_name": "bubble_sort_renamed.py",
        "program_a": '''def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                temp = arr[j]
                arr[j] = arr[j + 1]
                arr[j + 1] = temp
    return arr

data = [64, 34, 25, 12, 22, 11, 90]
sorted_data = bubble_sort(data)
print(sorted_data)
''',
        "program_b": '''def perform_array_sort(items):
    array_size = len(items)
    for pass_idx in range(array_size):
        for comp_idx in range(0, array_size - pass_idx - 1):
            if items[comp_idx] > items[comp_idx + 1]:
                swap_holder = items[comp_idx]
                items[comp_idx] = items[comp_idx + 1]
                items[comp_idx + 1] = swap_holder
    return items

raw_values = [64, 34, 25, 12, 22, 11, 90]
ordered_result = perform_array_sort(raw_values)
print(ordered_result)
'''
    },
    "case4_modified_statements": {
        "title": "Case 4: Modified Statements & Minor Refactoring",
        "clone_type": "Type-3 Near-Miss Clone",
        "description": "Prime number checker where Program B adds intermediary variables, reorders initial conditions, and inserts a print logging step.",
        "program_a_name": "prime_checker_direct.py",
        "program_b_name": "prime_checker_modified.py",
        "program_a": '''def is_prime(num):
    if num <= 1:
        return False
    if num == 2:
        return True
    if num % 2 == 0:
        return False
    factor = 3
    while factor * factor <= num:
        if num % factor == 0:
            return False
        factor += 2
    return True

val = 29
if is_prime(val):
    print("Prime")
else:
    print("Composite")
''',
        "program_b": '''def is_prime(num):
    # Reordered base validations
    if num == 2:
        return True
    if num <= 1 or num % 2 == 0:
        return False

    factor = 3
    is_divisible = False
    while factor * factor <= num:
        print("Checking factor:", factor)
        if num % factor == 0:
            is_divisible = True
            break
        factor += 2

    return not is_divisible

val = 29
res = is_prime(val)
if res:
    print("Prime")
else:
    print("Composite")
'''
    },
    "case5_different_logic": {
        "title": "Case 5: Completely Different Logic",
        "clone_type": "Non-Clone (Distinct Logic)",
        "description": "Matrix Multiplication versus String Palindrome Verification. Tests that independent algorithms result in Low Structural Similarity (<20%).",
        "program_a_name": "matrix_multiply.py",
        "program_b_name": "palindrome_check.py",
        "program_a": '''def matrix_multiply(A, B):
    rows_A = len(A)
    cols_A = len(A[0])
    cols_B = len(B[0])
    result = [[0 for _ in range(cols_B)] for _ in range(rows_A)]

    for i in range(rows_A):
        for j in range(cols_B):
            for k in range(cols_A):
                result[i][j] += A[i][k] * B[k][j]
    return result

mat1 = [[1, 2], [3, 4]]
mat2 = [[5, 6], [7, 8]]
print(matrix_multiply(mat1, mat2))
''',
        "program_b": '''def is_palindrome(text):
    cleaned = ""
    for char in text.lower():
        if char.isalnum():
            cleaned += char

    left = 0
    right = len(cleaned) - 1
    while left < right:
        if cleaned[left] != cleaned[right]:
            return False
        left += 1
        right -= 1
    return True

sample = "A man, a plan, a canal: Panama"
print(is_palindrome(sample))
'''
    }
}
