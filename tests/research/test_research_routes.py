"""Exercise the deployed Flask boundary with real validation and assessment."""
import io
from unittest.mock import patch

import pytest

from src.app import app
from src.research.assessment import LIMITS, ResourceLimit


@pytest.fixture
def client():
    app.config.update(TESTING=True)
    with app.test_client() as client:
        yield client


def test_workspace_and_control_discovery(client):
    response = client.get("/research")
    assert response.status_code == 200
    assert b"4D-NOD" in response.data
    assert client.get("/research/").status_code == 200
    response = client.get("/api/research/controls")
    assert response.status_code == 200
    data = response.get_json()
    assert set(item["id"] for item in data["controls"]) == {"three_piece_s4", "branched_tetrahedron", "singular_vertex"}
    assert data["limits"]["request_bytes"] == 524288
    assert all("control" in item["geometry"]["role"] for item in data["controls"])


def test_symbolic_http_intake_never_constructs_geometry(client):
    response = client.post("/api/research/assess", json={"candidate": {"pieces": [
        {"operations": "Txy+ · Lw− · Txy+"}, {"operations": "empty word"}, {"operations": ["Pzw+"]}]}})
    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "no-store"
    result = response.get_json()
    assert result["status"] == "not_tested"
    assert result["assembled"] is None
    assert result["candidate"]["pieces"][0]["operations"] == ["Txy+", "Lw-", "Txy+"]
    assert all(check["status"] == "not_tested" for check in result["checks"])


@pytest.mark.parametrize("control,betti,facet,link,manifold", [
    ("three_piece_s4", [1, 0, 0, 0, 1], "passed", "passed", "not_tested"),
    ("branched_tetrahedron", [1, 0, 0, 0, 0], "failed", "passed", "failed"),
    ("singular_vertex", [1, 0, 0, 0, 2], "passed", "failed", "failed"),
])
def test_control_http_end_to_end(client, control, betti, facet, link, manifold):
    controls = client.get("/api/research/controls").get_json()["controls"]
    geometry = next(item["geometry"] for item in controls if item["id"] == control)
    response = client.post("/api/research/assess", json={"geometry": geometry})
    assert response.status_code == 200
    result = response.get_json()
    assert result["status"] == "completed"
    assert result["input"]["geometry"] == geometry
    assert result["assembled"]["betti_numbers_mod2"] == betti
    checks = {item["id"]: item for item in result["checks"]}
    assert checks["facet_incidence"]["status"] == facet
    assert checks["vertex_link_connectivity"]["status"] == link
    assert checks["manifold"]["status"] == manifold
    assert checks["physical_identity"]["status"] == "not_tested"


@pytest.mark.parametrize("raw", [b"{", b"", b"null", b"[]", b'"word"', b"true", b"42", b'{"x":NaN}', b'{"x":Infinity}', b'{"x":"\xff"}'])
def test_bad_json_and_top_level_types_are_controlled_400(client, raw):
    response = client.post("/api/research/assess", data=raw, content_type="application/json")
    assert response.status_code == 400
    assert response.get_json()["status"] == "invalid_input"


@pytest.mark.parametrize("payload", [
    {"candidate": []}, {"candidate": {"pieces": []}}, {"geometry": []},
    {"geometry": {"schema_version": "1", "model": {}, "pieces": []}},
    {"candidate": {"pieces": [{"operations": [True]}] * 3}},
])
def test_bad_schema_types_are_controlled_400(client, payload):
    response = client.post("/api/research/assess", json=payload)
    assert response.status_code == 400
    assert response.get_json()["status"] == "invalid_input"


def test_excessive_nesting_is_controlled(client):
    moderate = '{"metadata":' + "[" * 30 + "0" + "]" * 30 + "}"
    response = client.post("/api/research/assess", data=moderate, content_type="application/json")
    assert response.status_code == 422
    assert response.get_json()["status"] == "resource_limit"
    excessive = '{"metadata":' + "[" * 2000 + "0" + "]" * 2000 + "}"
    response = client.post("/api/research/assess", data=excessive, content_type="application/json")
    # The JSON parser's recursion threshold depends on the configured Python
    # interpreter. Either its parser guard or our stricter depth bound must
    # reject this request, without an unhandled exception or partial result.
    assert response.status_code in (400, 422)
    assert response.get_json()["status"] in ("invalid_input", "resource_limit")


def test_content_type_and_methods(client):
    response = client.post("/api/research/assess", data="{}", content_type="text/plain")
    assert response.status_code == 415
    assert "Content-Type" in response.get_json()["error"]
    assert client.get("/api/research/assess").status_code == 405
    assert client.post("/api/research/controls").status_code == 405


def test_raw_request_size_is_checked_before_assessment(client):
    raw = b" " * (LIMITS["request_bytes"] + 1)
    with patch("src.routes.research_routes.assess_payload") as assess:
        response = client.post("/api/research/assess", data=raw, content_type="application/json")
        assert response.status_code == 413
        assert response.get_json()["status"] == "resource_limit"
        assess.assert_not_called()


def test_unknown_length_stream_cannot_bypass_size_limit(client):
    raw = b" " * (LIMITS["request_bytes"] + 1)
    with patch("src.routes.research_routes.assess_payload") as assess:
        response = client.post("/api/research/assess", content_type="application/json",
                               environ_overrides={"wsgi.input": io.BytesIO(raw), "wsgi.input_terminated": True, "CONTENT_LENGTH": ""})
        assert response.status_code == 413
        assert response.get_json()["status"] == "resource_limit"
        assess.assert_not_called()


def test_resource_caps_and_time_interruption_return_no_success(client):
    controls = client.get("/api/research/controls").get_json()["controls"]
    geometry = controls[0]["geometry"]
    geometry["pieces"][0]["maximal_simplices"] *= 76
    response = client.post("/api/research/assess", json={"geometry": geometry})
    assert response.status_code == 422
    assert response.get_json()["status"] == "resource_limit"
    assert "assembled" not in response.get_json()
    with patch("src.routes.research_routes.assess_payload", side_effect=ResourceLimit("time budget exceeded")):
        response = client.post("/api/research/assess", json={})
        assert response.status_code == 422
        assert response.get_json() == {"error": "time budget exceeded", "status": "resource_limit"}


@pytest.mark.parametrize("value", [10 ** 400, -(10 ** 400), 10 ** 13, -(10 ** 13)])
@pytest.mark.parametrize("target", ["coordinate", "frame"])
def test_large_json_numbers_are_rejected_without_float_overflow(client, value, target):
    geometry = client.get("/api/research/controls").get_json()["controls"][0]["geometry"]
    coordinates = [{"vertex": i, "position": [i, 0, 0, 0]} for i in range(6)]
    geometry["embedding"] = {"coordinates": coordinates}
    if target == "coordinate":
        coordinates[0]["position"][0] = value
    else:
        geometry["embedding"].update({
            "animation_kind": "illustrative_phase", "description": "Explicit test frames.",
            "frames": [{"value": 0, "coordinates": coordinates}, {"value": value, "coordinates": coordinates}],
        })
    response = client.post("/api/research/assess", json={"geometry": geometry})
    assert response.status_code == 400
    assert response.get_json()["status"] == "invalid_input"
    assert "absolute value at most 1e12" in response.get_json()["error"]


def test_display_numeric_boundaries_are_accepted(client):
    geometry = client.get("/api/research/controls").get_json()["controls"][0]["geometry"]
    coordinates = [{"vertex": i, "position": [10 ** 12, -(10 ** 12), i, 0]} for i in range(6)]
    geometry["embedding"] = {
        "coordinates": coordinates, "animation_kind": "illustrative_phase", "description": "Explicit test frames.",
        "frames": [{"value": -(10 ** 12), "coordinates": coordinates}, {"value": 10 ** 12, "coordinates": coordinates}],
    }
    response = client.post("/api/research/assess", json={"geometry": geometry})
    assert response.status_code == 200
    assert response.get_json()["visualization"]["kind"] == "supplied_coordinates"
