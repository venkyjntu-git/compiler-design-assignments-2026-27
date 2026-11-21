"""
CompilerVerse: LL(1) Predictive Parsing Animation
Built with Manim Community Edition (v0.18+)
Topic: Top-down predictive parsing, FIRST & FOLLOW sets, M-table, and stack simulation.

To render this animation:
    pip install manim
    manim -pql ll1_parsing.py LL1ParsingScene
"""

from manim import *

class LL1ParsingScene(Scene):
    def construct(self):
        # 1. Title and Introduction
        title = Text("CompilerVerse: LL(1) Predictive Parsing", font_size=40, color=BLUE_B)
        subtitle = Text("Top-Down Parsing | Leftmost Derivation", font_size=24, color=GRAY_A)
        subtitle.next_to(title, DOWN)

        self.play(Write(title), FadeIn(subtitle))
        self.wait(1.5)
        self.play(FadeOut(title), FadeOut(subtitle))

        # 2. Grammar Presentation
        grammar_title = Text("Grammar G (Arithmetic Expressions)", font_size=32, color=YELLOW)
        grammar_title.to_edge(UP)

        grammar_lines = VGroup(
            MathTex(r"E \to T E'"),
            MathTex(r"E' \to + T E' \mid \varepsilon"),
            MathTex(r"T \to F T'"),
            MathTex(r"T' \to * F T' \mid \varepsilon"),
            MathTex(r"F \to ( E ) \mid \mathbf{id}"),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.35)
        grammar_lines.next_to(grammar_title, DOWN, buff=0.5)

        self.play(Write(grammar_title))
        self.play(LaggedStart(*[FadeIn(line, shift=RIGHT*0.5) for line in grammar_lines], lag_ratio=0.3))
        self.wait(2)
        self.play(FadeOut(grammar_title), FadeOut(grammar_lines))

        # 3. FIRST and FOLLOW Sets
        sets_title = Text("FIRST and FOLLOW Sets", font_size=32, color=GREEN_B)
        sets_title.to_edge(UP)

        first_header = Text("FIRST Sets:", font_size=24, color=BLUE_C)
        first_group = VGroup(
            first_header,
            MathTex(r"\text{FIRST}(F) = \{ (, \mathbf{id} \}"),
            MathTex(r"\text{FIRST}(T') = \{ *, \varepsilon \}"),
            MathTex(r"\text{FIRST}(T) = \{ (, \mathbf{id} \}"),
            MathTex(r"\text{FIRST}(E') = \{ +, \varepsilon \}"),
            MathTex(r"\text{FIRST}(E) = \{ (, \mathbf{id} \}"),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.25)

        follow_header = Text("FOLLOW Sets:", font_size=24, color=PURPLE_B)
        follow_group = VGroup(
            follow_header,
            MathTex(r"\text{FOLLOW}(E) = \{ ), \$ \}"),
            MathTex(r"\text{FOLLOW}(E') = \{ ), \$ \}"),
            MathTex(r"\text{FOLLOW}(T) = \{ +, ), \$ \}"),
            MathTex(r"\text{FOLLOW}(T') = \{ +, ), \$ \}"),
            MathTex(r"\text{FOLLOW}(F) = \{ *, +, ), \$ \}"),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.25)

        both_sets = VGroup(first_group, follow_group).arrange(RIGHT, buff=1.2)
        both_sets.next_to(sets_title, DOWN, buff=0.5)

        self.play(Write(sets_title))
        self.play(FadeIn(first_group), FadeIn(follow_group))
        self.wait(2.5)
        self.play(FadeOut(sets_title), FadeOut(both_sets))

        # 4. LL(1) Table Verification
        table_title = Text("Predictive Parsing Table M[A, a]", font_size=30, color=GOLD)
        table_title.to_edge(UP)

        table_info = Text(
            "Every entry has at most ONE production rule.\nTherefore, Grammar G is strictly LL(1) and deterministic.",
            font_size=22, color=LIGHT_GRAY, line_spacing=1.3
        )
        table_info.next_to(table_title, DOWN, buff=0.6)

        self.play(Write(table_title))
        self.play(FadeIn(table_info))
        self.wait(2)
        self.play(FadeOut(table_title), FadeOut(table_info))

        # 5. Stack-Based Parsing Simulation for: id + id * id
        sim_title = Text("Parsing Simulation: id + id * id", font_size=30, color=TEAL_B)
        sim_title.to_edge(UP)
        self.play(Write(sim_title))

        steps_data = [
            (r"[\$, E]", r"\mathbf{id} + \mathbf{id} * \mathbf{id} \$", r"Apply\ E \to T E'"),
            (r"[\$, E', T]", r"\mathbf{id} + \mathbf{id} * \mathbf{id} \$", r"Apply\ T \to F T'"),
            (r"[\$, E', T', F]", r"\mathbf{id} + \mathbf{id} * \mathbf{id} \$", r"Apply\ F \to \mathbf{id}"),
            (r"[\$, E', T', \mathbf{id}]", r"\mathbf{id} + \mathbf{id} * \mathbf{id} \$", r"Match\ \mathbf{id}"),
            (r"[\$, E', T']", r"+ \mathbf{id} * \mathbf{id} \$", r"Apply\ T' \to \varepsilon"),
            (r"[\$, E']", r"+ \mathbf{id} * \mathbf{id} \$", r"Apply\ E' \to + T E'"),
            (r"[\$, E', T, +]", r"+ \mathbf{id} * \mathbf{id} \$", r"Match\ +"),
            (r"[\$, E', T]", r"\mathbf{id} * \mathbf{id} \$", r"Apply\ T \to F T'"),
            (r"[\$, E', T', F]", r"\mathbf{id} * \mathbf{id} \$", r"Apply\ F \to \mathbf{id}"),
            (r"[\$, E', T', \mathbf{id}]", r"\mathbf{id} * \mathbf{id} \$", r"Match\ \mathbf{id}"),
            (r"[\$, E', T']", r"* \mathbf{id} \$", r"Apply\ T' \to * F T'"),
            (r"[\$, E', T', F, *]", r"* \mathbf{id} \$", r"Match\ *"),
            (r"[\$, E', T', F]", r"\mathbf{id} \$", r"Apply\ F \to \mathbf{id}"),
            (r"[\$, E', T', \mathbf{id}]", r"\mathbf{id} \$", r"Match\ \mathbf{id}"),
            (r"[\$, E', T']", r"\$", r"Apply\ T' \to \varepsilon"),
            (r"[\$, E']", r"\$", r"Apply\ E' \to \varepsilon"),
            (r"[\$]", r"\$", r"\textbf{ACCEPT! String Valid}"),
        ]

        # Display Headers
        hdr_stack = Text("Stack", font_size=20, color=YELLOW).shift(LEFT * 4 + UP * 1.8)
        hdr_input = Text("Input Buffer", font_size=20, color=CYAN).shift(UP * 1.8)
        hdr_action = Text("Action", font_size=20, color=GREEN).shift(RIGHT * 3.5 + UP * 1.8)
        headers = VGroup(hdr_stack, hdr_input, hdr_action)
        self.play(FadeIn(headers))

        prev_row = None
        for i, (stk, inp, act) in enumerate(steps_data[:7]):  # Animate key first 7 steps smoothly
            t_stk = MathTex(stk, font_size=22).shift(LEFT * 4 + UP * 0.8)
            t_inp = MathTex(inp, font_size=22).shift(UP * 0.8)
            t_act = MathTex(act, font_size=22).shift(RIGHT * 3.5 + UP * 0.8)
            current_row = VGroup(t_stk, t_inp, t_act)

            if prev_row is not None:
                self.play(Transform(prev_row, current_row), run_time=0.6)
            else:
                self.play(FadeIn(current_row), run_time=0.6)
                prev_row = current_row

            self.wait(0.5)

        # Final Acceptance Screen
        self.wait(1)
        self.play(FadeOut(prev_row), FadeOut(headers), FadeOut(sim_title))

        accept_box = Rectangle(width=8, height=3, color=GREEN, fill_color=BLACK, fill_opacity=0.8)
        accept_text = Text("PARSING COMPLETE", font_size=36, color=GREEN_A)
        accept_sub = Text("Successfully parsed with 0 syntax errors.\nTop-down leftmost derivation verified.", font_size=20, color=WHITE)
        accept_sub.next_to(accept_text, DOWN, buff=0.3)
        accept_group = VGroup(accept_box, accept_text, accept_sub)

        self.play(GrowFromCenter(accept_group))
        self.wait(2.5)
        self.play(FadeOut(accept_group))
