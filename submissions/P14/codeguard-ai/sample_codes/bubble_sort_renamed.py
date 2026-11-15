def perform_array_sort(items):
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
