import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_home_and_health():
    res_home = client.get("/")
    assert res_home.status_code == 200
    assert res_home.json()["status"] == "running"

    res_health = client.get("/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "healthy"

def test_get_samples():
    res = client.get("/api/samples")
    assert res.status_code == 200
    samples = res.json()
    assert len(samples) >= 4
    assert any(s["id"] == "while_loop" for s in samples)

def test_cfg_build_api():
    code = """
    int main() {
        int x = 1;
        while (x < 10) {
            x = x + 1;
        }
        return x;
    }
    """
    res = client.post("/api/cfg/build", json={"code": code})
    assert res.status_code == 200
    data = res.json()
    assert "blocks" in data
    assert "edges" in data
    block_ids = [b["id"] for b in data["blocks"]]
    assert "ENTRY" in block_ids
    assert "EXIT" in block_ids

def test_analyze_all_api():
    code = """
    int main() {
        int a = 5;
        int b = 10;
        int x = a + b;
        int y = a + b;
        return x + y;
    }
    """
    res = client.post("/api/analyze/all", json={"code": code})
    assert res.status_code == 200
    data = res.json()
    assert "cfg" in data
    assert "reaching_definitions" in data
    assert "live_variables" in data
    assert "available_expressions" in data
    assert "optimizations" in data

def test_syntax_error_api():
    code = "int main() { int x = ; }"
    res = client.post("/api/analyze/all", json={"code": code})
    assert res.status_code == 400
    data = res.json()
    assert "detail" in data
    assert data["detail"]["error_type"] == "ParserError"
