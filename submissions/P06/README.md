# Attribute Grammar Evaluator

A Python-based compiler that performs lexical analysis, syntax analysis, semantic evaluation using attribute grammars, intermediate code generation, and Python code generation.

## Team
-  B.Haritha ,Roll Number:24VV1A0511
-  K.Pravallika, Roll Number: 24VV1A0535
-  N. Sahithya, Roll Number: 24VV1A0544 

- Problem: P06 - Compiler for Attribute Grammar Evaluator
- Course: Compiler Design, 2026-27

## Problem Statement

Evaluating expressions manually becomes difficult when expressions contain multiple operators, parentheses, and different operator priorities. This project develops a compiler that evaluates arithmetic expressions using attribute grammars. It performs lexical analysis and syntax analysis to understand the input expression. It then evaluates attributes, generates intermediate code, and produces executable Python code. This helps demonstrate how compiler phases work together to process and evaluate expressions.

## Background Theory

An Attribute Grammar is a type of context-free grammar in which grammar symbols are associated with attributes. These attributes store information and help perform semantic evaluation.

**Types of Attributes:**

1. **Synthesized Attributes**
   - Values are calculated using the attributes of child nodes.
   - Information moves from children to parent nodes.

2. **Inherited Attributes**
   - Values are passed from parent nodes or sibling nodes.
   - Information moves from parent or sibling nodes to child nodes.

**Worked Example**

Input:

```text
2 + 3 * 4
```

### Step 1: Lexical Analysis

Tokens:

```text
2, +, 3, *, 4
```

### Step 2: Syntax Analysis

The parser creates an Abstract Syntax Tree (AST) representing the expression and its operator precedence.

### Step 3: Attribute Evaluation

```text
3 * 4 = 12
2 + 12 = 14
```

### Step 4: Intermediate Code Generation

```text
t1 = 3 * 4
t2 = 2 + t1
result = t2
```

### Step 5: Python Code Generation

```python
result = (2 + (3 * 4))
print(result)
```

Output:

```text
14
```

## Features

- [x] Lexical analysis using Python.
- [x] Syntax analysis using a recursive descent parser.
- [x] Abstract Syntax Tree (AST) construction.
- [x] Synthesized attribute evaluation.
- [x] Semantic evaluation.
- [x] Symbol table implementation.
- [x] Intermediate code generation.
- [x] Python code generation.
- [x] Execution of generated Python code.
- [x] Error handling for invalid expressions and division by zero.
- [x] Six example programs.
- [x] Unit testing and benchmarking.

## Architecture

The compiler follows a sequence of phases to process arithmetic expressions.

```text
       Source Program
              |
              v
        Lexical Analyzer
              |
              v
         Syntax Analyzer
              |
              v
       Abstract Syntax Tree
              |
              v
       Attribute Evaluator
              |
              v
       Semantic Evaluation
              |
              v
     Intermediate Code (IR)
              |
              v
        Python Code Generator
              |
              v
        Generated Python Code
              |
              v
             Runtime
              |
              v
            Output
```

**Key Data Structures**

- **Tokens:** Store token type, value, and position.
- **AST:** Represents the structure of arithmetic expressions.
- **Attribute Values:** Store calculated values of grammar symbols.
- **Symbol Table:** Stores identifiers and their associated values.
- **Intermediate Representation:** Stores instructions using temporary variables.

## Installation

**Requirements**
- Python 3.10 or above.
- Visual Studio Code (recommended).

Open the project directory in the terminal:

```bash
cd submissions/P06
```

Install the requirements:

```bash
pip install -r requirements.txt
```

No external Python libraries are required.

## Usage

### 1. Run the compiler

```bash
python main.py examples/01_addition.py
```

### 2. Run the compiler and execute generated Python code

```bash
python main.py examples/02_precedence.py --run
```

### 3. Run all example programs

```bash
python main.py examples/01_addition.py --run
python main.py examples/02_precedence.py --run
python main.py examples/03_parentheses.py --run
python main.py examples/04_subtraction.py --run
python main.py examples/05_division.py --run
python main.py examples/06_unary.py --run
```

## Examples and Results

| Example | Input | Output |
|---|---|---:|
| Addition | `2 + 3` | 5 |
| Operator precedence | `2 + 3 * 4` | 14 |
| Parentheses | `(2 + 3) * 4` | 20 |
| Subtraction | `20 - 5 - 3` | 12 |
| Division | `18 / 3 + 2` | 8 |
| Unary operator | `-5 + 2 * 3` | 1 |

**Sample Execution**

Input:

```text
2 + 3 * 4
```

Output:

```text
Evaluated value: 14.0

Intermediate representation:
t1 = 3.0 * 4.0
t2 = 2.0 + t1
result = t2

Execution result:
14
```

## Testing

Run all test cases using:

```bash
python -m unittest discover -s tests -v
```

**Tests cover:**

- Token generation and invalid characters.
- Parser correctness and syntax errors.
- Attribute evaluation.
- Arithmetic operations and division by zero.
- Symbol table operations.
- Intermediate code generation.
- Python code generation.

## Limitations and Future Work

**Limitations**
- Supports only arithmetic expressions.
- Does not support variables or user-defined functions in source programs.
- Implements synthesized attribute evaluation for the supported grammar.
- Does not compile complete Python programs.

**Future Work**
- Add inherited attribute evaluation.
- Support variables and data types.
- Extend the grammar with comparison and logical operators.
- Add more semantic error checks.
- Implement additional optimization techniques.


## Credits and References

- Alfred V. Aho, Monica S. Lam, Ravi Sethi, and Jeffrey D. Ullman, *Compilers: Principles, Techniques, and Tools*.
- Compiler Design course materials.
- Python official documentation: https://docs.python.org/3/
- Python `unittest` documentation.
- AI assistance: ChatGPT was used for project planning, code development assistance, and documentation preparation.
