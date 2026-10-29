"""Focused evidence and hostile-input tests for the bounded service."""
import copy
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from src.research.assessment import assess_payload, control_cases, ResourceLimit


class AssessmentTests(unittest.TestCase):
    def setUp(self):
        self.controls = {item["id"]: item for item in control_cases()}

    def assess(self, key):
        return assess_payload({"geometry": self.controls[key]["geometry"]})

    @staticmethod
    def checks(result):
        return {item["id"]: item for item in result["checks"]}

    def test_sphere_control_exact_homology_and_qualified_result(self):
        result = self.assess("three_piece_s4")
        self.assertEqual(result["assembled"]["dimension"], 4)
        self.assertEqual(result["assembled"]["betti_numbers_mod2"], [1, 0, 0, 0, 1])
        self.assertEqual(result["assembled"]["euler_characteristic"], 2)
        self.assertEqual(result["assembled"]["face_counts_by_dimension"], [6, 15, 20, 15, 6])
        checks = self.checks(result)
        self.assertEqual(checks["closure"]["status"], "passed")
        self.assertEqual(checks["manifold"]["status"], "not_tested")
        self.assertEqual(checks["physical_identity"]["status"], "not_tested")
        self.assertEqual(result["model"]["version"], "1.0")
        self.assertIn("input", result)
        self.assertEqual(len(result["input_sha256"]), 64)
        self.assertTrue(result["visualization"]["seams"])
        json.dumps(result, allow_nan=False)

    def test_branched_witness_and_edge_highlighting(self):
        result = self.assess("branched_tetrahedron")
        witness = result["assembled"]["overfull_tetrahedra"]
        self.assertEqual(witness, [{"facet": (0, 1, 2, 3), "incidence": 3}])
        checks = self.checks(result)
        self.assertEqual(checks["facet_incidence"]["status"], "failed")
        self.assertEqual(checks["closure"]["status"], "not_tested")
        self.assertEqual(checks["manifold"]["status"], "failed")
        self.assertEqual(sum(e["overfull"] for e in result["visualization"]["edges"]), 6)

    def test_singularity_passes_facets_but_disconnected_link_fails(self):
        result = self.assess("singular_vertex")
        checks = self.checks(result)
        self.assertEqual(checks["facet_incidence"]["status"], "passed")
        self.assertEqual(checks["closure"]["status"], "passed")
        self.assertEqual(checks["vertex_link_connectivity"]["status"], "failed")
        witness = checks["vertex_link_connectivity"]["evidence"]["disconnected_links"]
        self.assertEqual(len(witness), 1)
        self.assertEqual(witness[0]["vertex"], 0)
        self.assertEqual(witness[0]["component_count"], 2)
        self.assertEqual(result["assembled"]["betti_numbers_mod2"], [1, 0, 0, 0, 2])
        self.assertEqual(checks["manifold"]["status"], "failed")

    def test_unmodeled_candidate_is_never_assessed(self):
        result = assess_payload({"candidate": {"pieces": [
            {"operations": ["Txy+", "Txy+", "Lx−"]},
            {"operations": []}, {"operations": ["Pzw+"]}]}})
        self.assertEqual(result["status"], "not_tested")
        self.assertIsNone(result["assembled"])
        self.assertIsNone(result["visualization"])
        self.assertTrue(all(c["status"] == "not_tested" for c in result["checks"]))
        self.assertEqual(result["candidate"]["pieces"][0]["operations"], ["Txy+", "Txy+", "Lx-"])
        self.assertTrue(result["candidate"]["candidate_id"].startswith("TR-P"))

    def test_candidate_identity_and_large_integer_preserved(self):
        candidate = {"pieces": [{"operations": ["Pzw-"] * 50}, {"operations": []}, {"operations": []}]}
        result = assess_payload({"candidate": candidate})
        rank = result["candidate"]["pieces"][0]["word_rank"]
        self.assertIsInstance(rank, str)
        self.assertGreater(int(rank), 2 ** 53)
        candidate["candidate_id"] = "TR-P00000-P00000-P00000"
        with self.assertRaisesRegex(ValueError, "identity"):
            assess_payload({"candidate": candidate})

    def test_declared_exterior_interface_passes_exact_boundary(self):
        geometry = self.controls["branched_tetrahedron"]["geometry"]
        # Three adjacent facets of one 5-simplex have an exterior boundary and
        # no overfull tetrahedron. The list is an explicit researcher target.
        geometry["pieces"] = self.controls["three_piece_s4"]["geometry"]["pieces"]
        for p in geometry["pieces"]:
            p["maximal_simplices"] = p["maximal_simplices"][:1]
        geometry["joining"]["target"] = "exterior_interface"
        preliminary = assess_payload({"geometry": geometry})
        self.assertEqual(self.checks(preliminary)["closure"]["status"], "not_tested")
        geometry["joining"]["expected_exterior_faces"] = [list(f) for f in preliminary["assembled"]["boundary_tetrahedra"]]
        result = assess_payload({"geometry": geometry})
        self.assertGreater(len(result["assembled"]["boundary_tetrahedra"]), 0)
        self.assertEqual(self.checks(result)["closure"]["status"], "passed")
        geometry["joining"]["expected_exterior_faces"].pop()
        self.assertEqual(self.checks(assess_payload({"geometry": geometry}))["closure"]["status"], "failed")

    def test_seam_declaration_checks_ownership_and_incidence(self):
        geometry = self.controls["three_piece_s4"]["geometry"]
        preliminary = assess_payload({"geometry": geometry})
        actual = preliminary["visualization"]["seams"][0]
        geometry["joining"]["intended_seams"] = [{"face": actual["face"], "pieces": actual["pieces"]}]
        result = assess_payload({"geometry": geometry})
        self.assertEqual(self.checks(result)["intended_seams"]["status"], "passed")
        geometry["joining"]["intended_seams"][0]["pieces"] = ["A", "C"] if actual["pieces"] == ["A", "B"] else ["A", "B"]
        self.assertEqual(self.checks(assess_payload({"geometry": geometry}))["intended_seams"]["status"], "failed")

    def test_invalid_data_is_rejected_before_topology(self):
        for field, value in (("schema_version", "9"), ("pieces", []), ("joining", {"method": "execute_python"}), ("model", {"id": "x"})):
            geometry = copy.deepcopy(self.controls["three_piece_s4"]["geometry"])
            geometry[field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):
                assess_payload({"geometry": geometry})
        for simplex in ([0, 0], [True, 1], [0, {}, 2], [0, 1, 2, 3, 4, 5], [2 ** 54, 1], ["", 1]):
            geometry = copy.deepcopy(self.controls["three_piece_s4"]["geometry"])
            geometry["pieces"][0]["maximal_simplices"] = [simplex]
            with self.subTest(simplex=simplex), self.assertRaises(ValueError):
                assess_payload({"geometry": geometry})
        with self.assertRaises(ValueError):
            assess_payload({"metadata": float("nan")})

    def test_limits_are_explicit(self):
        geometry = self.controls["three_piece_s4"]["geometry"]
        geometry["pieces"][0]["maximal_simplices"] *= 76
        with self.assertRaisesRegex(ResourceLimit, "150"):
            assess_payload({"geometry": geometry})
        with self.assertRaises(ResourceLimit):
            assess_payload({"metadata": "a" * 524288})
        with self.assertRaises(ResourceLimit):
            assess_payload({"candidate": {"pieces": [{"operations": ["Txy+"] * 4097}] * 3}})

    def test_maximum_symbolic_word_exceeds_python_decimal_guard(self):
        result = assess_payload({"candidate": {"pieces": [{"operations": ["Txy+"] * 4096}, {"operations": []}, {"operations": []}]}})
        rank = result["candidate"]["pieces"][0]["word_rank"]
        self.assertGreater(len(rank), 4300)
        self.assertEqual(result["candidate"]["pieces"][0]["candidate_id"], "P" + rank)

    def test_budget_interrupt_has_no_partial_success(self):
        with patch("src.research.assessment.time.monotonic", side_effect=[0, 20]):
            with self.assertRaisesRegex(ResourceLimit, "interrupted"):
                self.assess("three_piece_s4")

    def test_explicit_coordinates_and_animation_validated(self):
        geometry = self.controls["three_piece_s4"]["geometry"]
        coords = [{"vertex": i, "position": [i, i * 2, 0, 0]} for i in range(6)]
        geometry["embedding"] = {"coordinates": coords, "animation_kind": "illustrative_phase",
                                 "description": "Supplied illustrative frames; not physical evolution.",
                                 "frames": [{"value": 0, "coordinates": coords}, {"value": 1, "coordinates": coords}]}
        result = assess_payload({"geometry": geometry})
        self.assertEqual(result["visualization"]["kind"], "supplied_coordinates")
        geometry["embedding"]["frames"][1]["value"] = 0
        with self.assertRaisesRegex(ValueError, "increasing"):
            assess_payload({"geometry": geometry})

    def test_typed_vertices_do_not_merge(self):
        geometry = self.controls["three_piece_s4"]["geometry"]
        geometry["pieces"] = [
            {"name": "A", "maximal_simplices": [[0, 1, 2, 3, 4]]},
            {"name": "B", "maximal_simplices": [["0", "1", "2", "3", "4"]]},
            {"name": "C", "maximal_simplices": [[10, 11, 12, 13, 14]]},
        ]
        result = assess_payload({"geometry": geometry})
        self.assertEqual(result["assembled"]["component_count"], 3)
        ids = {item["id"] for item in result["visualization"]["vertices"]}
        self.assertIn("i:0", ids)
        self.assertIn("s:0", ids)


if __name__ == "__main__":
    unittest.main()

