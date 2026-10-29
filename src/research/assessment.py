"""Validated finite-complex assessment, independent of HTTP and persistence.

Adapted from this project's topological_assessment prototypes. Inputs are JSON
data only. No operation label is interpreted as a map or physical observable.
"""

from collections import defaultdict
from datetime import datetime, timezone
from hashlib import sha256
from itertools import combinations
import json
import math
import time

from .candidate_feed import parse_word, rank_word
from .topology import analyze, _key

TEST_VERSION = "4d-nod-finite-complex/1.0.0"
SCHEMA_VERSION = "1"
LIMITS = {"request_bytes": 524288, "maximal_simplices": 150, "vertices": 250,
          "vertices_per_simplex": 5, "operations_per_piece": 4096,
          "frames": 120, "seconds": 8}
LIMITATIONS = [
    "Abstract finite simplicial complexes with shared vertex labels do not represent every triangulation, self-identification, smooth atlas, or physical geometry.",
    "Facet-incidence checks and connected vertex links are necessary conditions in the pure 4D setting; passing them does not establish a manifold or exclude other singularities.",
    "Exact mod-2 homology does not uniquely identify a manifold or prove orientability.",
    "Smoothness, orientability, Pin structure, causality, dynamical stability, and physical particle identity are not established.",
    "A label involving w does not imply a Lorentzian isometry or physical time evolution.",
    "Piece colors and A/B/C labels identify pieces, not QCD color charge.",
]


class ResourceLimit(ValueError):
    """A calculation exceeds an explicit application resource bound."""


def _vertex(value):
    if isinstance(value, bool) or not isinstance(value, (str, int)):
        raise ValueError("vertex labels must be strings or integers, excluding booleans")
    if isinstance(value, str) and (not value or len(value) > 80):
        raise ValueError("string vertex labels must contain 1–80 characters")
    if isinstance(value, int) and abs(value) > 9007199254740991:
        raise ValueError("integer vertex labels must be JavaScript-safe; use a string for larger labels")
    return value


def _face(value, maximum=5):
    if not isinstance(value, list) or not 1 <= len(value) <= maximum:
        raise ValueError(f"a simplex/face must be an array of 1–{maximum} vertex labels")
    values = [_vertex(v) for v in value]
    if len(set(values)) != len(values):
        raise ValueError("a simplex/face cannot repeat a vertex")
    return tuple(sorted(values, key=_key))


def _text(value, name, required=False, maximum=8000):
    if value is None and not required:
        return None
    if not isinstance(value, str) or len(value) > maximum or (required and not value.strip()):
        raise ValueError(f"{name} must be {'a nonempty' if required else 'a'} string of at most {maximum} characters")
    return value


def _json_copy(value):
    # Check depth before json.dumps: deeply nested metadata must not exhaust the
    # decoder/encoder stack. Frameworks must also cap raw HTTP request bytes.
    stack = [(value, 0)]
    visited = 0
    while stack:
        item, depth = stack.pop()
        visited += 1
        if depth > 24 or visited > 60000:
            raise ResourceLimit("JSON nesting or item count exceeds the application bound")
        if isinstance(item, dict):
            if any(not isinstance(key, str) for key in item):
                raise ValueError("JSON object keys must be strings")
            stack.extend((v, depth + 1) for v in item.values())
        elif isinstance(item, list):
            stack.extend((v, depth + 1) for v in item)
    try:
        encoded = json.dumps(value, ensure_ascii=False, allow_nan=False, sort_keys=True)
    except (TypeError, ValueError, RecursionError) as exc:
        raise ValueError("input must be finite JSON data") from exc
    if len(encoded.encode("utf-8")) > LIMITS["request_bytes"]:
        raise ResourceLimit("input exceeds the 512 KiB application limit")
    return json.loads(encoded), encoded


def _candidate(raw):
    if raw is None:
        return None
    if not isinstance(raw, dict) or not isinstance(raw.get("pieces"), list) or len(raw["pieces"]) != 3:
        raise ValueError("candidate must contain exactly three ordered pieces A, B, C")
    pieces = []
    for name, piece in zip("ABC", raw["pieces"]):
        if not isinstance(piece, dict):
            raise ValueError("candidate pieces must be objects")
        if piece.get("name", name) != name:
            raise ValueError("candidate pieces must be ordered A, B, C")
        operations = piece.get("operations")
        if not isinstance(operations, (list, str)):
            raise ValueError("candidate operations must be an array or supported word string")
        if isinstance(operations, list) and len(operations) > LIMITS["operations_per_piece"]:
            raise ResourceLimit("this request supports at most 4096 operations per piece; the symbolic catalog has no theoretical repetition limit")
        if isinstance(operations, list) and any(not isinstance(op, str) for op in operations):
            raise ValueError("operation labels must be strings")
        operations = parse_word(operations)
        if len(operations) > LIMITS["operations_per_piece"]:
            raise ResourceLimit("this request supports at most 4096 operations per piece")
        # Python's configurable integer-to-string guard defaults to 4300
        # digits. Convert bounded ranks in base-1e9 chunks without changing
        # that process-wide security setting for the surrounding application.
        rank_integer = rank_word(operations)
        chunks = []
        while rank_integer:
            rank_integer, remainder = divmod(rank_integer, 1000000000)
            chunks.append(remainder)
        rank = str(chunks[-1]) + "".join(f"{chunk:09d}" for chunk in reversed(chunks[:-1])) if chunks else "0"
        identity = "P" + rank.zfill(5)
        if piece.get("candidate_id", identity) != identity or str(piece.get("word_rank", rank)) != rank:
            raise ValueError(f"piece {name} identity/rank does not match its operations")
        pieces.append({"name": name, "candidate_id": identity, "word_rank": rank, "operations": list(operations)})
    identity = "TR-" + "-".join(p["candidate_id"] for p in pieces)
    if raw.get("candidate_id", identity) != identity:
        raise ValueError("triple identity does not match ordered A, B, C piece identities")
    return {"candidate_id": identity, "pieces": pieces}


def _coordinates(raw, vertices, name):
    if not isinstance(raw, list) or len(raw) != len(vertices):
        raise ValueError(f"{name} must supply exactly one coordinate record per complex vertex")
    seen = set()
    for item in raw:
        if not isinstance(item, dict):
            raise ValueError(f"{name} entries must be objects")
        vertex = _vertex(item.get("vertex"))
        if vertex not in vertices or vertex in seen:
            raise ValueError(f"{name} has an unknown or duplicate vertex")
        seen.add(vertex)
        position = item.get("position")
        if not isinstance(position, list) or len(position) not in (3, 4):
            raise ValueError("coordinates require three or four explicitly supplied components")
        # Compare magnitude before math.isfinite: converting a valid JSON
        # integer with hundreds of digits to float would raise OverflowError.
        if any(isinstance(x, bool) or not isinstance(x, (int, float)) or abs(x) > 1e12 or not math.isfinite(x) for x in position):
            raise ValueError("coordinate components must be finite numbers with absolute value at most 1e12")
    dimensions = {len(item["position"]) for item in raw}
    if len(dimensions) != 1:
        raise ValueError("coordinate dimensions must be consistent within a frame")
    return next(iter(dimensions))


def _geometry(raw):
    if not isinstance(raw, dict):
        raise ValueError("geometry must be an object or null")
    if str(raw.get("schema_version")) != SCHEMA_VERSION:
        raise ValueError("geometry.schema_version must be '1'")
    model = raw.get("model")
    if not isinstance(model, dict):
        raise ValueError("geometry.model must declare an id and version")
    _text(model.get("id"), "model.id", True, 160)
    _text(model.get("version"), "model.version", True, 160)
    pieces = raw.get("pieces")
    if not isinstance(pieces, list) or len(pieces) != 3:
        raise ValueError("geometry must contain exactly three labeled pieces A, B, C")
    all_simplices = []
    validated = []
    for name, piece in zip("ABC", pieces):
        if not isinstance(piece, dict) or piece.get("name") != name:
            raise ValueError("geometry pieces must be ordered and named A, B, C")
        simplices = piece.get("maximal_simplices")
        if not isinstance(simplices, list) or not simplices:
            raise ValueError(f"piece {name} requires nonempty maximal_simplices")
        if len(all_simplices) + len(simplices) > LIMITS["maximal_simplices"]:
            raise ResourceLimit("at most 150 maximal simplices across all pieces per assessment")
        simplices = [_face(s) for s in simplices]
        all_simplices.extend(simplices)
        validated.append({"name": name, "maximal_simplices": simplices})
    vertices = {v for simplex in all_simplices for v in simplex}
    if len(vertices) > LIMITS["vertices"]:
        raise ResourceLimit("at most 250 vertices per assessment")
    joining = raw.get("joining")
    if not isinstance(joining, dict) or joining.get("method") != "shared_vertex_labels":
        raise ValueError("joining.method must explicitly be 'shared_vertex_labels'")
    if joining.get("target") not in ("closed", "exterior_interface", "unspecified"):
        raise ValueError("joining.target must be closed, exterior_interface, or unspecified")
    for field in ("expected_exterior_faces", "intended_seams"):
        if field in joining and (not isinstance(joining[field], list) or len(joining[field]) > 750):
            raise ValueError(f"{field} must be an array with at most 750 entries")
    exterior = [_face(face, 4) for face in joining.get("expected_exterior_faces", [])]
    if len(exterior) != len(set(exterior)):
        raise ValueError("expected exterior faces cannot repeat")
    seams = []
    for seam in joining.get("intended_seams", []):
        if not isinstance(seam, dict):
            raise ValueError("intended seam entries must be objects")
        names = seam.get("pieces")
        if not isinstance(names, list) or len(names) != 2 or any(not isinstance(n, str) or n not in ("A", "B", "C") for n in names) or len(set(names)) != 2:
            raise ValueError("each intended seam must name two different pieces from A, B, C")
        face = _face(seam.get("face"), 4)
        if len(face) != 4:
            raise ValueError("intended seams in this implementation must be tetrahedral faces")
        seams.append({"pieces": sorted(names), "face": face})
    if len({s["face"] for s in seams}) != len(seams):
        raise ValueError("intended seam faces cannot repeat")
    if any(v not in vertices for face in exterior for v in face) or any(v not in vertices for s in seams for v in s["face"]):
        raise ValueError("declared seam/exterior face contains an unknown vertex")
    embedding = raw.get("embedding")
    if embedding is not None:
        if not isinstance(embedding, dict):
            raise ValueError("embedding must be an object")
        dimensions = _coordinates(embedding.get("coordinates"), vertices, "embedding.coordinates")
        if "frames" in embedding:
            frames = embedding["frames"]
            if not isinstance(frames, list) or not 2 <= len(frames) <= LIMITS["frames"]:
                raise ValueError("animation requires 2–120 explicit coordinate frames")
            if embedding.get("animation_kind") not in ("illustrative_phase", "fourth_coordinate_slice", "model_evolution"):
                raise ValueError("animation_kind must explicitly identify the animation meaning")
            _text(embedding.get("description"), "animation description", True)
            previous = -math.inf
            for frame in frames:
                if not isinstance(frame, dict):
                    raise ValueError("animation frames must be objects")
                value = frame.get("value")
                if isinstance(value, bool) or not isinstance(value, (int, float)) or abs(value) > 1e12 or not math.isfinite(value) or value <= previous:
                    raise ValueError("frame values must be finite, strictly increasing, and have absolute value at most 1e12")
                previous = value
                if _coordinates(frame.get("coordinates"), vertices, "frame.coordinates") != dimensions:
                    raise ValueError("animation coordinate dimensions must match the embedding")
    return validated, all_simplices, joining, exterior, seams


def _check(identity, label, status, evidence):
    return {"id": identity, "label": label, "status": status, "evidence": evidence}


def _state(flag):
    return "passed" if flag else "failed"


def _link_components(simplices, vertex):
    """Graph connectivity of a simplicial vertex link; no sphere recognition."""
    links = [tuple(v for v in simplex if v != vertex) for simplex in simplices if vertex in simplex]
    parent = {v: v for link in links for v in link}

    def root(v):
        while parent[v] != v:
            parent[v] = parent[parent[v]]
            v = parent[v]
        return v

    for link in links:
        for v in link[1:]:
            parent[root(v)] = root(link[0])
    groups = defaultdict(list)
    for v in parent:
        groups[root(v)].append(v)
    return [sorted(group, key=_key) for group in groups.values()]


def _visualization(pieces, assembled):
    vertex_owners = defaultdict(set)
    edge_owners = defaultdict(set)
    facet_owners = defaultdict(set)
    incidence = defaultdict(int)
    for piece in pieces:
        for simplex in piece["maximal_simplices"]:
            for vertex in simplex:
                vertex_owners[vertex].add(piece["name"])
            for edge in combinations(simplex, 2):
                edge_owners[edge].add(piece["name"])
            if len(simplex) == 5:
                for face in combinations(simplex, 4):
                    facet_owners[face].add(piece["name"])
                    incidence[face] += 1
    boundary = assembled["boundary_tetrahedra"] or []
    overfull = assembled["overfull_tetrahedra"] or []
    seams = [{"face": list(face), "pieces": sorted(owners), "incidence": incidence[face]}
             for face, owners in facet_owners.items() if len(owners) > 1]
    def edges_of(faces):
        return {edge for face in faces for edge in combinations(face, 2)}
    boundary_edges = edges_of(boundary)
    overfull_edges = edges_of([item["facet"] for item in overfull])
    seam_edges = edges_of([item["face"] for item in seams])
    return {
        "kind": "incidence_schematic",
        "vertices": [{"id": ("i:" if isinstance(v, int) else "s:") + str(v), "label": v, "pieces": sorted(names)}
                     for v, names in sorted(vertex_owners.items(), key=lambda item: _key(item[0]))],
        "edges": [{"vertices": list(edge), "pieces": sorted(names), "boundary": edge in boundary_edges,
                   "overfull": edge in overfull_edges, "seam": edge in seam_edges} for edge, names in edge_owners.items()],
        "seams": seams, "boundary_faces": boundary, "overfull_faces": overfull,
    }


def assess_payload(payload):
    """Return qualified evidence or raise ValueError/ResourceLimit.

    All bounds are operational, not theoretical bounds on the catalog. The
    caller may process a larger batch as separate requests and retain completed
    results client-side. There is no server-local persistence or arbitrary code.
    """
    started = time.monotonic()
    payload, encoded = _json_copy(payload)
    if not isinstance(payload, dict):
        raise ValueError("request must be a JSON object")
    candidate = _candidate(payload.get("candidate"))
    geometry = payload.get("geometry")
    report = {
        "schema_version": SCHEMA_VERSION, "test_version": TEST_VERSION,
        "assessed_at": datetime.now(timezone.utc).isoformat(),
        "input_sha256": sha256(encoded.encode("utf-8")).hexdigest(),
        "input": payload, "candidate": candidate, "model": None,
        "status": "not_tested", "assembled": None, "pieces": [], "checks": [],
        "limitations": LIMITATIONS, "limits": LIMITS,
        "persistence": "No durable server storage. Export this report to retain input, evidence, and versions.",
        "candidate_mapping": "Not supplied; a symbolic word is not a geometric construction.",
        "physical_interpretation": "Not tested; no implemented observable derivation establishes particle identity.",
        "visualization": None,
    }
    if geometry is None:
        for identity, label in (("geometry", "Explicit geometry"), ("closure", "Closure"), ("manifold", "Manifold structure"), ("smoothness", "Smoothness"), ("physical_identity", "Physical particle identity")):
            report["checks"].append(_check(identity, label, "not_tested", "Geometry and joining data have not been supplied."))
        report["missing_definitions"] = ["explicit geometry", "joining", "operation maps", "physical observables"]
        return report
    pieces, simplices, joining, exterior, intended_seams = _geometry(geometry)
    report["model"] = geometry["model"]
    def budget():
        if time.monotonic() - started > LIMITS["seconds"]:
            raise ResourceLimit("assessment interrupted after the 8-second application time budget; use a smaller complex")
    for piece in pieces:
        budget()
        report["pieces"].append({"name": piece["name"], "topology": analyze(piece["maximal_simplices"], budget=budget)})
    assembled = analyze(simplices, budget=budget)
    report["assembled"] = assembled
    report["status"] = "completed"
    checks = report["checks"]
    for identity, label, flag, evidence in (
        ("dimension", "Dimension is four", assembled["dimension"] == 4, {"dimension": assembled["dimension"]}),
        ("purity", "Pure complex", assembled["pure"], {"simplex_counts": assembled["face_counts_by_dimension"]}),
        ("connected", "Connected assembly", assembled["connected"], {"component_count": assembled["component_count"]}),
    ):
        checks.append(_check(identity, label, _state(flag), evidence))
    applicable = assembled["dimension"] == 4 and assembled["pure"]
    overfull = assembled["overfull_tetrahedra"] or []
    boundary = {tuple(face) for face in assembled["boundary_tetrahedra"] or []}
    checks.append(_check("facet_incidence", "At most two 4-simplices per tetrahedron", _state(not overfull) if applicable else "not_tested",
                         {"applicable_to_pure_4d": applicable, "overfull_tetrahedra": overfull}))
    if not applicable or joining["target"] == "unspecified":
        closure_status = "not_tested"
    elif joining["target"] == "closed":
        closure_status = _state(not boundary)
    elif "expected_exterior_faces" in joining:
        closure_status = _state(boundary == set(exterior))
    else:
        closure_status = "not_tested"
    checks.append(_check("closure", "Declared boundary target", closure_status,
                         {"target": joining["target"], "boundary_tetrahedra": sorted(boundary, key=lambda f: tuple(map(_key, f))),
                          "expected_exterior_faces": exterior if "expected_exterior_faces" in joining else None,
                          "note": "An intentional exterior boundary is not automatically a failure. Exterior-interface closure requires an exact declared boundary list."}))
    visualization = _visualization(pieces, assembled)
    actual_seams = {tuple(item["face"]): item for item in visualization["seams"]}
    seam_evidence = []
    for seam in intended_seams:
        actual = actual_seams.get(seam["face"])
        seam_evidence.append({"face": seam["face"], "expected_pieces": seam["pieces"], "actual": actual,
                              "matches": bool(actual and actual["pieces"] == seam["pieces"] and actual["incidence"] == 2)})
    checks.append(_check("intended_seams", "Declared internal seam assignments", _state(all(item["matches"] for item in seam_evidence)) if applicable and seam_evidence else "not_tested",
                         {"seams": seam_evidence, "note": "Only declared tetrahedral seams are checked; completeness of the declaration is not inferred."}))
    witnesses = []
    if applicable:
        for v in {v for s in simplices for v in s}:
            budget()
            components = _link_components(simplices, v)
            if len(components) != 1:
                witnesses.append({"vertex": v, "component_count": len(components), "components": components})
    checks.append(_check("vertex_link_connectivity", "Connected vertex links (necessary only)", _state(not witnesses) if applicable else "not_tested",
                         {"algorithm": "Union-find on the one-skeleton of each simplicial vertex link", "prerequisites": "Pure 4-dimensional abstract complex",
                          "disconnected_links": witnesses, "limit": "Does not recognize 3-spheres/3-balls or test every lower-dimensional link."}))
    checks.append(_check("homology", "Exact homology over F2", "passed", {"algorithm": "Binary Gaussian elimination with integer bitset columns", "betti_numbers_mod2": assembled["betti_numbers_mod2"], "euler_characteristic": assembled["euler_characteristic"], "meaning": "Computation completed; these values are not manifold or particle identification."}))
    checks.append(_check("manifold", "Manifold structure", "failed" if applicable and (witnesses or overfull) else "not_tested",
                         "An obstruction was found." if applicable and (witnesses or overfull) else "Necessary conditions cannot establish manifold structure; full link recognition is not implemented."))
    for identity, label in (("smoothness", "Smooth structure"), ("orientability", "Orientability"), ("pin_structure", "Pin structure"), ("causality", "Causality"), ("stability", "Dynamical stability"), ("physical_identity", "Physical particle identity")):
        checks.append(_check(identity, label, "not_tested", "No applicable implemented assessment; declarations alone are not evidence."))
    model = geometry["model"]
    definitions = ("underlying_space", "operation_definitions", "composition", "direction_conventions", "equivalence_rules", "differentiability", "metric", "time_convention", "physical_mapping")
    report["missing_definitions"] = [name for name in definitions if not model.get(name)]
    report["candidate_mapping"] = "Explicit complex assessed independently. Any declared operation mapping is preserved as research input and is not implemented or verified."
    if geometry.get("embedding"):
        visualization["kind"] = "supplied_coordinates"
        visualization["embedding"] = geometry["embedding"]
        checks.append(_check("embedding_validity", "Geometric validity of supplied coordinates", "not_tested",
                             "Coordinate format is validated for display only. Injectivity, intersections, metric compatibility, and an embedding of the abstract complex are not established."))
    report["visualization"] = visualization
    report["elapsed_ms"] = round((time.monotonic() - started) * 1000, 3)
    return report


def control_cases():
    """Return independent explicit mathematical controls, never quark models."""
    s4 = [list(simplex) for simplex in combinations(range(6), 5)]
    singular = s4 + [list(simplex) for simplex in combinations([0, 6, 7, 8, 9, 10], 5)]
    def case(identity, title, description, simplices, target="closed"):
        size = len(simplices) // 3
        return {"id": identity, "title": title, "description": description,
                "geometry": {"schema_version": SCHEMA_VERSION, "role": "mathematical control, not a quark model",
                             "model": {"id": identity, "version": "1.0", "underlying_space": "Explicit abstract finite simplicial complex", "operation_definitions": None},
                             "pieces": [{"name": name, "maximal_simplices": simplices[i*size:(i+1)*size] if i < 2 else simplices[i*size:]} for i, name in enumerate("ABC")],
                             "joining": {"method": "shared_vertex_labels", "target": target}}}
    return [
        case("three_piece_s4", "Three-piece 4-sphere control", "Boundary of a 5-simplex partitioned into three pieces. Expected mod-2 Betti numbers [1,0,0,0,1].", s4),
        case("branched_tetrahedron", "Branched junction control", "Three 4-simplices share tetrahedron [0,1,2,3], with incidence 3.", [[0,1,2,3,4],[0,1,2,3,5],[0,1,2,3,6]], "unspecified"),
        case("singular_vertex", "Singular vertex control", "Two 4-sphere boundaries meet at vertex 0. All facet incidences pass, but the link of vertex 0 is disconnected.", singular),
    ]
