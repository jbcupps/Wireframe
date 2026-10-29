import unittest
from itertools import combinations

from src.research.topology import analyze


class TopologyAssessmentTests(unittest.TestCase):
    def test_single_4_simplex_is_not_closed(self):
        result = analyze([(0, 1, 2, 3, 4)])
        self.assertEqual(result["dimension"], 4)
        self.assertTrue(result["pure"])
        self.assertTrue(result["connected"])
        self.assertEqual(result["face_counts_by_dimension"], [5, 10, 10, 5, 1])
        self.assertEqual(result["euler_characteristic"], 1)
        self.assertEqual(result["betti_numbers_mod2"], [1, 0, 0, 0, 0])
        self.assertEqual(len(result["boundary_tetrahedra"]), 5)
        self.assertEqual(result["overfull_tetrahedra"], [])
        self.assertFalse(result["necessary_checks"]["no_boundary_top_facets"])

    def test_boundary_of_5_simplex_has_s4_homology(self):
        result = analyze(combinations(range(6), 5))
        self.assertEqual(result["face_counts_by_dimension"], [6, 15, 20, 15, 6])
        self.assertEqual(result["euler_characteristic"], 2)
        self.assertEqual(result["betti_numbers_mod2"], [1, 0, 0, 0, 1])
        self.assertEqual(result["boundary_tetrahedra"], [])
        self.assertEqual(result["overfull_tetrahedra"], [])
        self.assertIn("not established", result["assessment"])

    def test_three_4_simplices_sharing_one_tetrahedron_branch(self):
        result = analyze([(0, 1, 2, 3, 4), (0, 1, 2, 3, 5), (0, 1, 2, 3, 6)])
        self.assertEqual(result["overfull_tetrahedra"], [{"facet": (0, 1, 2, 3), "incidence": 3}])
        self.assertEqual(len(result["boundary_tetrahedra"]), 12)
        self.assertFalse(result["necessary_checks"]["no_overfull_top_facets"])
        self.assertEqual(result["betti_numbers_mod2"], [1, 0, 0, 0, 0])

    def test_facets_alone_do_not_establish_manifold(self):
        # Two copies of the boundary of a 5-simplex meet at one vertex. Every
        # tetrahedron has two incident 4-simplices, but the common vertex link
        # consists of two disconnected 3-spheres: it is not a manifold point.
        complex_ = list(combinations([0, 1, 2, 3, 4, 5], 5))
        complex_ += list(combinations([0, 6, 7, 8, 9, 10], 5))
        result = analyze(complex_)
        self.assertTrue(result["connected"])
        self.assertTrue(result["pure"])
        self.assertEqual(result["boundary_tetrahedra"], [])
        self.assertEqual(result["overfull_tetrahedra"], [])
        self.assertEqual(result["betti_numbers_mod2"], [1, 0, 0, 0, 2])
        self.assertEqual(result["euler_characteristic"], 3)
        self.assertIn("not established", result["assessment"])

    def test_disconnected_and_nonpure(self):
        disjoint = analyze([(0, 1, 2, 3, 4), (10, 11, 12, 13, 14)])
        self.assertEqual(disjoint["component_count"], 2)
        self.assertEqual(disjoint["betti_numbers_mod2"][0], 2)
        nonpure = analyze([(0, 1, 2, 3, 4), ("a", "b", "c", "d")])
        self.assertFalse(nonpure["pure"])
        self.assertEqual(nonpure["component_count"], 2)

    def test_invalid_maximal_input_rejected(self):
        for invalid in ([], [(0, 0)], [(0, 1), (1, 0)], [(0,), (0, 1)], [(True, 2)]):
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                analyze(invalid)

    def test_zero_dimensional_input(self):
        result = analyze([("a",), ("b",)])
        self.assertEqual(result["dimension"], 0)
        self.assertEqual(result["betti_numbers_mod2"], [2])
        self.assertIsNone(result["boundary_tetrahedra"])

    def test_circle_and_mixed_vertex_labels(self):
        result = analyze([(0, "a"), ("a", "b"), ("b", 0)])
        self.assertEqual(result["betti_numbers_mod2"], [1, 1])
        self.assertEqual(result["euler_characteristic"], 0)
        self.assertEqual(result["boundary_facets"], [])


if __name__ == "__main__":
    unittest.main()

