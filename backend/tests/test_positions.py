import pytest
from fastapi.testclient import TestClient

from app.api.routes.positions import _POSITIONS, _POSITION_NETWORKS
from app.main import app


@pytest.fixture(autouse=True)
def clean_positions_store():
    """Ensure in-memory position store is clean before and after every test."""
    _POSITIONS.clear()
    _POSITION_NETWORKS.clear()
    yield
    _POSITIONS.clear()
    _POSITION_NETWORKS.clear()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_list_positions_empty(client: TestClient):
    """GET /positions/ returns an empty list when no positions are tracked."""
    response = client.get("/positions/")
    assert response.status_code == 200
    assert response.json() == []


def test_list_positions_populated(client: TestClient):
    """GET /positions/ returns all tracked positions."""
    pos1 = {
        "address": "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
        "collateral_usd": 1500.0,
        "debt_xau": 0.5,
        "collateral_ratio_bps": 15000,
    }
    pos2 = {
        "address": "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674JZ",
        "collateral_usd": 3000.0,
        "debt_xau": 1.0,
        "collateral_ratio_bps": 16000,
    }

    client.post("/positions/", json=pos1)
    client.post("/positions/", json=pos2)

    response = client.get("/positions/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2

    addresses = {item["address"] for item in data}
    assert pos1["address"] in addresses
    assert pos2["address"] in addresses


def test_list_positions_network_filter(client: TestClient):
    """GET /positions/?network=... filters positions by network."""
    pos_testnet = {
        "address": "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
        "collateral_usd": 2000.0,
        "debt_xau": 0.8,
        "collateral_ratio_bps": 13000,
    }
    pos_mainnet = {
        "address": "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674JZ",
        "collateral_usd": 5000.0,
        "debt_xau": 1.5,
        "collateral_ratio_bps": 14000,
    }

    client.post("/positions/?network=testnet", json=pos_testnet)
    client.post("/positions/?network=mainnet", json=pos_mainnet)

    # Filter testnet
    res_testnet = client.get("/positions/?network=testnet")
    assert res_testnet.status_code == 200
    testnet_data = res_testnet.json()
    assert len(testnet_data) == 1
    assert testnet_data[0]["address"] == pos_testnet["address"]

    # Filter mainnet
    res_mainnet = client.get("/positions/?network=mainnet")
    assert res_mainnet.status_code == 200
    mainnet_data = res_mainnet.json()
    assert len(mainnet_data) == 1
    assert mainnet_data[0]["address"] == pos_mainnet["address"]

    # Filter non-existent network
    res_futurenet = client.get("/positions/?network=futurenet")
    assert res_futurenet.status_code == 200
    assert res_futurenet.json() == []

    # Unfiltered returns all
    res_all = client.get("/positions/")
    assert res_all.status_code == 200
    assert len(res_all.json()) == 2


def test_get_position_by_address(client: TestClient):
    """GET /positions/{address} returns the specific position or 404."""
    pos = {
        "address": "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
        "collateral_usd": 1200.0,
        "debt_xau": 0.4,
        "collateral_ratio_bps": 11500,
    }
    client.post("/positions/", json=pos)

    # Found
    res = client.get(f"/positions/{pos['address']}")
    assert res.status_code == 200
    assert res.json()["address"] == pos["address"]

    # Not found
    res_404 = client.get("/positions/GCNONEXISTENTADDRESS")
    assert res_404.status_code == 404
    assert res_404.json()["detail"] == "No position found for this address"
