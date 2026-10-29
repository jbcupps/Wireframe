"""Necessary combinatorial checks for finite simplicial complexes.

Input is a finite iterable of maximal simplices, each a nonempty iterable
of distinct integer or string vertex labels. The complex consists of all
subsets of those simplices. The software computes exact incidence and homology
over F2; it does not construct geometry from twist/loop words.

For a pure 4D complex, one incident 4-simplex at a tetrahedral facet indicates
a combinatorial boundary facet, two is locally consistent with an interior
facet, and more than two is a necessary-condition obstruction to a simplicial
4-manifold. These facet counts are NOT sufficient to establish a manifold:
links of lower-dimensional simplices may be singular. We do not test links,
orientability, equivalence, a smooth structure, geometric gluing maps,
causality, or physical stability. A compact complex with no boundary facets
is not automatically a closed 4-manifold. For a non-pure complex, facet
incidences refer only to maximal simplices of the highest dimension.
"""

from collections import Counter
from itertools import combinations


def _key(vertex):
    """Stable ordering when integer and string labels occur together."""
    return (0, vertex) if isinstance(vertex, int) else (1, vertex)


def _normalize(maximal_simplices):
    result = []
    seen = set()
    for simplex in maximal_simplices:
        if isinstance(simplex, (str, bytes)):
            raise ValueError("a simplex must be an iterable of vertex labels")
        vertices = tuple(simplex)
        if not vertices:
            raise ValueError("empty maximal simplices are not supported")
        if any(isinstance(v, bool) or not isinstance(v, (int, str)) for v in vertices):
            raise ValueError("vertex labels must be strings or integers, excluding bool")
        if len(set(vertices)) != len(vertices):
            raise ValueError("a simplex cannot repeat a vertex")
        simplex = tuple(sorted(vertices, key=_key))
        if simplex in seen:
            raise ValueError("duplicate maximal simplex")
        seen.add(simplex)
        result.append(simplex)
    if not result:
        raise ValueError("at least one maximal simplex is required")
    # The caller promises maximal simplices. Detect lower simplices embedded in
    # another listed simplex so an accidental duplicate description is not
    # misread as a non-pure component.
    for simplex in result:
        for size in range(1, len(simplex)):
            if any(face in seen for face in combinations(simplex, size)):
                raise ValueError("input contains a simplex that is not maximal")
    return sorted(result, key=lambda s: (len(s), tuple(map(_key, s))))


def _f2_rank(columns, budget=lambda: None):
    """Compute rank of a binary matrix given its columns as integer bitsets."""
    pivots = {}
    for col in columns:
        budget()
        while col:
            pivot = col.bit_length() - 1
            if pivot in pivots:
                col ^= pivots[pivot]
            else:
                pivots[pivot] = col
                break
    return len(pivots)


def analyze(maximal_simplices, budget=lambda: None):
    """Return exact finite-complex data and 4D necessary-condition checks.

    ``boundary_tetrahedra`` and ``overfull_tetrahedra`` are applicable to
    dimension four; they are ``None`` otherwise. The same top-facet data is
    available for any positive dimension as ``boundary_facets`` and
    ``overfull_facets``. Each overfull item records the facet and its incidence.
    The empty complex is intentionally unsupported.
    """
    budget()
    maximal = _normalize(maximal_simplices)
    dimension = max(len(simplex) - 1 for simplex in maximal)
    pure = all(len(simplex) == dimension + 1 for simplex in maximal)
    top = [simplex for simplex in maximal if len(simplex) == dimension + 1]

    levels = [set() for _ in range(dimension + 1)]
    for simplex in maximal:
        budget()
        for k in range(1, len(simplex) + 1):
            levels[k - 1].update(combinations(simplex, k))
    levels = [sorted(level, key=lambda s: tuple(map(_key, s))) for level in levels]
    face_counts = [len(level) for level in levels]

    # Union-find identifies connected components even for 0D input.
    vertices = [vertex[0] for vertex in levels[0]]
    parent = {vertex: vertex for vertex in vertices}

    def root(v):
        while parent[v] != v:
            parent[v] = parent[parent[v]]
            v = parent[v]
        return v

    for simplex in maximal:
        representative = root(simplex[0])
        for vertex in simplex[1:]:
            parent[root(vertex)] = representative
    components = len({root(v) for v in vertices})

    boundary_ranks = [0] * (dimension + 2)
    for k in range(1, dimension + 1):
        budget()
        index = {simplex: i for i, simplex in enumerate(levels[k - 1])}
        columns = []
        for simplex in levels[k]:
            bits = 0
            for face in combinations(simplex, k):
                bits ^= 1 << index[face]
            columns.append(bits)
        boundary_ranks[k] = _f2_rank(columns, budget)
    betti = [face_counts[k] - boundary_ranks[k] - boundary_ranks[k + 1]
             for k in range(dimension + 1)]

    incidences = Counter()
    if dimension > 0:
        for simplex in top:
            incidences.update(combinations(simplex, dimension))
    ordered_facets = sorted(incidences, key=lambda s: tuple(map(_key, s)))
    boundary_facets = [f for f in ordered_facets if incidences[f] == 1]
    overfull = [{"facet": f, "incidence": incidences[f]}
                for f in ordered_facets if incidences[f] > 2]
    necessary_checks = {
        "dimension_is_4": dimension == 4,
        "pure": pure,
        "connected": components == 1,
        "no_overfull_top_facets": not overfull,
        "no_boundary_top_facets": not boundary_facets,
    }
    return {
        "dimension": dimension,
        "pure": pure,
        "number_of_maximal_simplices": len(maximal),
        "component_count": components,
        "connected": components == 1,
        "face_counts_by_dimension": face_counts,
        "euler_characteristic": sum((-1) ** k * n for k, n in enumerate(face_counts)),
        "boundary_ranks_mod2": boundary_ranks[:dimension + 1],
        "betti_numbers_mod2": betti,
        "boundary_facets": boundary_facets,
        "overfull_facets": overfull,
        "boundary_tetrahedra": boundary_facets if dimension == 4 else None,
        "overfull_tetrahedra": overfull if dimension == 4 else None,
        "necessary_checks": necessary_checks,
        "assessment": "NECESSARY CONDITIONS ONLY; manifold and smoothness not established",
    }
