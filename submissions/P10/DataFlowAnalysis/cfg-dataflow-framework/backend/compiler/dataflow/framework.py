from abc import ABC, abstractmethod
from typing import List, Dict, Set, Any, Optional
from compiler.cfg import CFG

class IterationStep:
    def __init__(
        self,
        iteration: int,
        block_id: str,
        direction: str,
        in_set: List[str],
        out_set: List[str],
        gen_set: List[str],
        kill_set: List[str],
        has_changed: bool,
        explanation: str
    ):
        self.iteration = iteration
        self.block_id = block_id
        self.direction = direction
        self.in_set = in_set
        self.out_set = out_set
        self.gen_set = gen_set
        self.kill_set = kill_set
        self.has_changed = has_changed
        self.explanation = explanation

    def to_dict(self) -> Dict[str, Any]:
        return {
            "iteration": self.iteration,
            "block_id": self.block_id,
            "direction": self.direction,
            "in_set": self.in_set,
            "out_set": self.out_set,
            "gen_set": self.gen_set,
            "kill_set": self.kill_set,
            "has_changed": self.has_changed,
            "explanation": self.explanation
        }

class DataFlowAnalysis(ABC):
    def __init__(self, cfg: CFG):
        self.cfg = cfg
        self.user_blocks = [b for b in cfg.blocks if not b.is_entry and not b.is_exit]
        self.steps: List[IterationStep] = []
        self.total_iterations = 0

    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @property
    @abstractmethod
    def direction(self) -> str:  # 'forward' or 'backward'
        pass

    @property
    @abstractmethod
    def meet_operator(self) -> str:  # '∪' or '∩'
        pass

    @property
    @abstractmethod
    def transfer_equation(self) -> str:
        pass

    @property
    @abstractmethod
    def confluence_equation(self) -> str:
        pass

    @property
    @abstractmethod
    def universal_set(self) -> List[str]:
        pass

    @abstractmethod
    def compute_local_sets(self):
        """Compute GEN & KILL or USE & DEF sets for each block."""
        pass

    @abstractmethod
    def run(self) -> Dict[str, Any]:
        """Run the iterative fixed-point algorithm and return complete analysis result."""
        pass
