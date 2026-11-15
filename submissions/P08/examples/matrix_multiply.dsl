# Matrix multiplication: C = A x B, summing over the shared dimension k in [0, 3)
tensor A[2, 3]
tensor B[3, 2]
tensor C[2, 2]

C[i, j] = sum(A[i, k] * B[k, j], k, 0, 3)
