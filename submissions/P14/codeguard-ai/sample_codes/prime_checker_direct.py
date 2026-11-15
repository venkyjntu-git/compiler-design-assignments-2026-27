def is_prime(num):
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
