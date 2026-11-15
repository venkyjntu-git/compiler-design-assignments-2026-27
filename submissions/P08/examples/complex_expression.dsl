# Combined arithmetic with operator precedence: C = A + 2*B - D
tensor A[2, 2]
tensor B[2, 2]
tensor D[2, 2]
tensor C[2, 2]

C[i, j] = A[i, j] + 2 * B[i, j] - D[i, j]
