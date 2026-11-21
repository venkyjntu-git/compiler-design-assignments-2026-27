"""
CompilerVerse: Canonical LR(1) Bottom-Up Parsing Animation
Built with Manim Community Edition (v0.18+)
Topic: LR(1) items, CLOSURE, GOTO, ACTION/GOTO tables, and Shift-Reduce parsing.

To render this animation:
    pip install manim
    manim -pql lr1_parsing.py LR1ParsingScene
"""

from manim import *

class LR1ParsingScene(Scene):
    def construct(self):
        # 1. Title and Introduction
        title = Text("CompilerVerse: Canonical LR(1) Parsing", font_size=40, color=PURPLE_B)
        subtitle = Text("Bottom-Up Parsing | Shift-Reduce & Rightmost Derivation in Reverse", font_size=22, color=GRAY_A)
        subtitle.next_to(title, DOWN)

        self.play(Write(title), FadeIn(subtitle))
        self.wait(1.5)
        self.play(FadeOut(title), FadeOut(subtitle))

        # 2. Augmented Grammar and LR(1) Items Definition
        item_title = Text("Augmented Grammar & LR(1) Items", font_size=32, color=YELLOW)
        item_title.to_edge(UP)

        def_text = VGroup(
            MathTex(r"\text{Augmented Grammar: } S' \to E"),
            MathTex(r"\text{LR(1) Item: } [A \to \alpha \bullet \beta, a]"),
            Text("where 'a' is a terminal or $ representing the lookahead symbol.", font_size=20, color=LIGHT_GRAY),
            Text("The dot (•) indicates how much of the production RHS has been seen so far.", font_size=20, color=LIGHT_GRAY),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.35)
        def_text.next_to(item_title, DOWN, buff=0.5)

        self.play(Write(item_title))
        self.play(LaggedStart(*[FadeIn(line, shift=RIGHT*0.5) for line in def_text], lag_ratio=0.3))
        self.wait(2.5)
        self.play(FadeOut(item_title), FadeOut(def_text))

        # 3. CLOSURE and GOTO Operations
        ops_title = Text("Core Operations: CLOSURE & GOTO", font_size=32, color=BLUE_B)
        ops_title.to_edge(UP)

        closure_box = VGroup(
            Text("CLOSURE(I):", font_size=24, color=CYAN),
            MathTex(r"\text{If } [A \to \alpha \bullet B \beta, a] \in I:"),
            MathTex(r"\text{Add } [B \to \bullet \gamma, b] \text{ for each } b \in \text{FIRST}(\beta a)"),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.2)

        goto_box = VGroup(
            Text("GOTO(I, X):", font_size=24, color=ORANGE),
            MathTex(r"\text{GOTO}(I, X) = \text{CLOSURE}(\{ [A \to \alpha X \bullet \beta, a] \mid [A \to \alpha \bullet X \beta, a] \in I \})"),
            Text("Transitions across states on terminal or non-terminal grammar symbol X.", font_size=18, color=LIGHT_GRAY),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.2)

        ops_group = VGroup(closure_box, goto_box).arrange(DOWN, buff=0.6)
        ops_group.next_to(ops_title, DOWN, buff=0.4)

        self.play(Write(ops_title))
        self.play(FadeIn(closure_box), FadeIn(goto_box))
        self.wait(3)
        self.play(FadeOut(ops_title), FadeOut(ops_group))

        # 4. ACTION and GOTO Table Mechanics
        table_title = Text("ACTION & GOTO Table Construction", font_size=30, color=GOLD)
        table_title.to_edge(UP)

        rules = VGroup(
            MathTex(r"\mathbf{Shift:} \quad \text{If } [A \to \alpha \bullet a \beta, b] \in I_i \text{ and } \text{GOTO}(I_i, a) = I_j \implies \text{ACTION}[i, a] = s_j"),
            MathTex(r"\mathbf{Reduce:} \quad \text{If } [A \to \alpha \bullet, a] \in I_i \text{ and } A \neq S' \implies \text{ACTION}[i, a] = r_k"),
            MathTex(r"\mathbf{Accept:} \quad \text{If } [S' \to E \bullet, \$] \in I_i \implies \text{ACTION}[i, \$] = \mathbf{acc}"),
            MathTex(r"\mathbf{GOTO:} \quad \text{If } \text{GOTO}(I_i, A) = I_j \implies \text{GOTO}[i, A] = j"),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.35)
        rules.next_to(table_title, DOWN, buff=0.5)

        self.play(Write(table_title))
        self.play(FadeIn(rules))
        self.wait(3)
        self.play(FadeOut(table_title), FadeOut(rules))

        # 5. Shift-Reduce Simulation on id + id * id
        sim_title = Text("LR(1) Shift-Reduce Simulation: id + id * id", font_size=28, color=TEAL_B)
        sim_title.to_edge(UP)
        self.play(Write(sim_title))

        lr_steps = [
            (r"[0]", r"[\$]", r"\mathbf{id} + \mathbf{id} * \mathbf{id} \$", r"\text{Shift } \mathbf{id}"),
            (r"[0, s_{id}]", r"[\$, \mathbf{id}]", r"+ \mathbf{id} * \mathbf{id} \$", r"\text{Reduce } F \to \mathbf{id}"),
            (r"[0, s_F]", r"[\$, F]", r"+ \mathbf{id} * \mathbf{id} \$", r"\text{Reduce } T \to F T'"),
            (r"[0, s_T]", r"[\$, T]", r"+ \mathbf{id} * \mathbf{id} \$", r"\text{Shift } +"),
            (r"[0, s_T, s_+]", r"[\$, T, +]", r"\mathbf{id} * \mathbf{id} \$", r"\text{Shift } \mathbf{id}"),
            (r"[0, s_T, s_+, s_{id}]", r"[\$, T, +, \mathbf{id}]", r"* \mathbf{id} \$", r"\text{Reduce } F \to \mathbf{id}"),
            (r"...", r"[\$, E]", r"\$", r"\mathbf{ACCEPT! Correct Bottom-Up Derivation}"),
        ]

        hdr_states = Text("State Stack", font_size=18, color=YELLOW).shift(LEFT * 4.5 + UP * 1.8)
        hdr_symbols = Text("Symbol Stack", font_size=18, color=CYAN).shift(LEFT * 1.5 + UP * 1.8)
        hdr_input = Text("Input Buffer", font_size=18, color=WHITE).shift(RIGHT * 1.5 + UP * 1.8)
        hdr_action = Text("Action", font_size=18, color=GREEN).shift(RIGHT * 4.5 + UP * 1.8)
        headers = VGroup(hdr_states, hdr_symbols, hdr_input, hdr_action)
        self.play(FadeIn(headers))

        prev_row = None
        for states, syms, inp, act in lr_steps:
            t_st = MathTex(states, font_size=20).shift(LEFT * 4.5 + UP * 0.8)
            t_sy = MathTex(syms, font_size=20).shift(LEFT * 1.5 + UP * 0.8)
            t_in = MathTex(inp, font_size=20).shift(RIGHT * 1.5 + UP * 0.8)
            t_ac = MathTex(act, font_size=20).shift(RIGHT * 4.5 + UP * 0.8)
            current_row = VGroup(t_st, t_sy, t_in, t_ac)

            if prev_row is not None:
                self.play(Transform(prev_row, current_row), run_time=0.6)
            else:
                self.play(FadeIn(current_row), run_time=0.6)
                prev_row = current_row
            self.wait(0.6)

        self.wait(1)
        self.play(FadeOut(prev_row), FadeOut(headers), FadeOut(sim_title))

        # Final Acceptance
        accept_box = Rectangle(width=8, height=3, color=PURPLE, fill_color=BLACK, fill_opacity=0.8)
        accept_text = Text("LR(1) PARSE COMPLETE", font_size=36, color=PURPLE_A)
        accept_sub = Text("Successfully parsed with 0 conflicts.\nCanonical collection & rightmost derivation in reverse verified.", font_size=18, color=WHITE)
        accept_sub.next_to(accept_text, DOWN, buff=0.3)
        accept_group = VGroup(accept_box, accept_text, accept_sub)

        self.play(GrowFromCenter(accept_group))
        self.wait(2.5)
        self.play(FadeOut(accept_group))
