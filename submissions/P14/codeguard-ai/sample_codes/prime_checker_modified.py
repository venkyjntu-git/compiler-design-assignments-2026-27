def is_prime(num):
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
