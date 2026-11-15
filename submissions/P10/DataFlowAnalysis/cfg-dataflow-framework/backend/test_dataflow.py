import pytest
from tac_parser import TACParser
from cfg import CFGBuilder
from dataflow.reaching_definitions import ReachingDefinitionsAnalysis
from dataflow.live_variables import LiveVariablesAnalysis
from dataflow.available_expressions import AvailableExpressionsAnalysis

SAMPLE_CODE = """
i = 1
sum = 0
L_LOOP:
if i > 10 goto L_END
sum = sum + i
i = i + 1
goto L_LOOP
L_END:
return sum
"""

def test_tac_parser():
    instrs = TACParser.parse_program(SAMPLE_CODE)
    assert len(instrs) == 9
    assert instrs[0].def_var == "i"
    assert instrs[1].def_var == "sum"
    assert instrs[2].type == "label"
    assert instrs[3].type == "if_goto"
    assert instrs[4].expr == "i + sum" or instrs[4].expr == "sum + i"

def test_cfg_builder():
    instrs = TACParser.parse_program(SAMPLE_CODE)
    builder = CFGBuilder(instrs)
    cfg = builder.build()
    
    # Verify blocks created
    block_ids = [b.id for b in cfg.blocks]
    assert "ENTRY" in block_ids
    assert "EXIT" in block_ids
    assert "B1" in block_ids
    
    # Leaders should include first instruction and loop header
    assert len(cfg.leaders) >= 3

def test_reaching_definitions():
    instrs = TACParser.parse_program(SAMPLE_CODE)
    builder = CFGBuilder(instrs)
    cfg = builder.build()
    
    analyzer = ReachingDefinitionsAnalysis(cfg)
    result = analyzer.run()
    
    assert result.analysis_type == "Reaching Definitions"
    assert result.total_iterations >= 1
    assert len(result.final_out) > 0
    # Every block should have an out set computed
    assert "B1" in result.final_out

def test_live_variables():
    instrs = TACParser.parse_program(SAMPLE_CODE)
    builder = CFGBuilder(instrs)
    cfg = builder.build()
    
    analyzer = LiveVariablesAnalysis(cfg)
    result = analyzer.run()
    
    assert result.analysis_type == "Live Variable Analysis"
    assert result.total_iterations >= 1
    assert "sum" in result.universal_set
    assert "i" in result.universal_set

def test_available_expressions():
    instrs = TACParser.parse_program(SAMPLE_CODE)
    builder = CFGBuilder(instrs)
    cfg = builder.build()
    
    analyzer = AvailableExpressionsAnalysis(cfg)
    result = analyzer.run()
    
    assert result.analysis_type == "Available Expressions"
    assert result.total_iterations >= 1
