# 4D-NOD research workspace

The workspace is available at `/research`, linked from the existing site navigation. The Python assessor runs through the existing Flask application. Client files in `src/static/research` are mirrored to `public/static/research` for the Vercel CDN; `test_static_assets.py` checks that the copies match. Flask explicitly serves `.mjs` with a JavaScript MIME type on Windows.

The `/research` workspace keeps symbolic descriptions, explicit geometry, and assessment evidence separate. The existing Flask application remains the host. Browser modules generate the catalog and visualize results; Python assesses only researcher-supplied finite simplicial complexes. No symbolic word constructs a geometry, and no result determines a particle identity.

The **Batch runner** generates a bounded range of ordered triples, matches explicitly supplied notebook geometry by exact candidate identity, assesses sequentially, checkpoints after each response, and exports qualified results. See [Research batches](research-batches.md) for the workflow, pause/resume behavior, checkpoint imports and limits. It runs while the page is open; it does not create a scheduled server job.

## Provenance and identities

The catalog ports the local `topological_assessment/candidate_feed.py` and the `Twist_and_Loop_Table_Explorer.html` conventions. The assessment adapts `topological_assessment/topology.py` and the explicit controls. The earlier `quark-wireframe.html` is a schematic illustration, not imported as assessed geometry.

The supplied workbook `4D_NOD_twist_loop_tables.xlsx` has SHA-256 `30d0dfe26c3a5b319cc8dbf8f13983060b1d3e00beeb07900ba3bbd50773e8a7`. All 33,825 configuration IDs, ordered words, and lengths were checked against the Python prototype. The local `outputs` copy differs at file level, but its complete configuration catalog also matches. The workbook contains 216 example triples; its `C0001`-style example row labels are not stable candidate IDs.

The ordered alphabet is 12 twists (`Txy±`, `Txz±`, `Txw±`, `Tyz±`, `Tyw±`, `Tzw±`), 8 axis loops (`Lx±`, `Ly±`, `Lz±`, `Lw±`), then 12 plane loops in the same plane order. Positive precedes negative. Canonical stored tokens use ASCII `-`; Unicode minus, middle-dot and arrow separators are accepted on import. Empty strings, `∅`, and `empty word` represent the empty sequence. Repetition and order are preserved without cancellation or equivalence rules.

Piece IDs use zero-based length-first base-32 ranks, padded to at least five digits: `P00000` is empty. A triple ID is `TR-<A ID>-<B ID>-<C ID>`. Bounded triple rows use the Cartesian product with C changing fastest; unbounded rows use `pair(a, pair(b, c))` with Cantor pairing. Displayed rows are one-based and are preserved separately from identity. Ranks use JavaScript `BigInt`, with decimal strings in JSON. The length-0-through-3 slice has 33,825 words and 38,700,218,390,625 ordered triples; these count formal descriptions, not distinct geometries.

## API and geometry contract

`GET /api/research/controls` supplies the mathematical controls. `POST /api/research/assess` accepts JSON with a candidate and optional geometry:

```json
{
  "candidate": {
    "pieces": [
      {"operations": ["Txy+", "Lw-"]},
      {"operations": []},
      {"operations": ["Pzw-"]}
    ]
  },
  "geometry": null
}
```

Pieces are always ordered A, B, C. Optional supplied `candidate_id` and `word_rank` values must agree with the operations. `geometry: null` produces `not_tested` assessments; the supplied symbols are never interpreted as code or geometric maps.

An explicit geometry has this shape; the controls provide complete valid examples:

```text
geometry:
  schema_version: "1"
  model: {id, version, ...researcher declarations}
  pieces: [{name: "A", maximal_simplices: [[vertices...], ...]}, B, C]
  joining:
    method: "shared_vertex_labels"
    target: "closed" | "exterior_interface" | "unspecified"
    expected_exterior_faces?: [[four vertex labels], ...]
    intended_seams?: [{pieces: ["A", "B"], face: [four vertex labels]}, ...]
  embedding?:
    coordinates: [{vertex, position: [x, y, z, w]}, ...]
    frames?: [{value, coordinates: [...]}, ...]
    animation_kind?: "illustrative_phase" | "fourth_coordinate_slice" | "model_evolution"
    description?: string
```

Vertices are distinct strings or JavaScript-safe integers within each simplex. Shared labels identify shared faces. This is an abstract finite simplicial complex, not a general gluing language: self-identifications, arbitrary triangulations, smooth atlases and physical metrics are not inferred. An intentional exterior interface is checked against its exact declared boundary list; a nonempty boundary alone is not an automatic failure for that target.

Model fields can preserve the underlying space, operation definitions, composition, directions, equivalence rules, differentiability, metric, time convention and physical mapping. Their presence does not mean the application executes or verifies those declarations. Missing definitions are reported. A `w` label does not establish physical time evolution or a Lorentzian isometry.

Reports preserve the full input, normalized candidate, model, assumptions, UTC assessment time, input SHA-256, schema version and test version (`4d-nod-finite-complex/1.0.0`). They include separate `passed`, `failed`, and `not_tested` checks with evidence, and assembled dimension, purity, connected components, simplex counts, tetrahedral boundaries, overfull-face witnesses, Euler characteristic and exact mod-2 Betti numbers. `status: completed` means the computation finished; it is not a validity verdict.

## Controls and mathematical limits

| Control ID | Input and expected evidence |
| --- | --- |
| `three_piece_s4` | Boundary of a 5-simplex partitioned into three pieces. Dimension 4, no boundary tetrahedra, Betti numbers `[1,0,0,0,1]`. |
| `branched_tetrahedron` | Three 4-simplices share `[0,1,2,3]`; that tetrahedron has incidence 3. |
| `singular_vertex` | Two 4-sphere boundaries meet at vertex 0. Facet-incidence checks pass, but the vertex link has two connected components. |

These are mathematical controls, not quarks or proposed localized non-orientable defects. Homology uses exact Gaussian elimination over F2 with integer bitsets. The additional singularity check uses union-find on the one-skeleton of each vertex link, applicable to pure 4D complexes. A disconnected link gives an obstruction; a connected link does not establish a 3-sphere or 3-ball. Full link recognition and Regina are not implemented. Passing the available checks does not establish manifold structure or rule out other singularities. Mod-2 homology neither classifies manifolds nor proves orientability. Smoothness, orientability, Pin structure, causality, stability and particle identity remain untested.

Without coordinates, visualization is an explicitly labeled incidence schematic. With coordinates, it displays a projection of the supplied data; frames appear only when supplied and are labeled by their declared meaning. Calculated seams, boundaries and overfull junctions come from assessment evidence. Piece colors identify A/B/C and do not mean QCD color charge. Physical benchmarks remain comparison inputs until a separate implemented mapping derives observables.

## Execution, storage and operational limits

The deployment uses Vercel's Python 3.12 runtime and the existing Flask entry point. See the official [Python runtime documentation](https://vercel.com/docs/functions/runtimes/python), [Flask deployment guide](https://vercel.com/docs/frameworks/backend/flask), and [function limits](https://vercel.com/docs/functions/limitations). Platform memory and duration depend on project settings and plan; these application limits are deliberately smaller. No new paid worker, database or external mathematical dependency is required.

| Area | Application limit |
| --- | --- |
| Assessment request | 512 KiB; JSON depth 24; 60,000 JSON items |
| Complex | 150 maximal simplices total, 250 vertices, at most 5 vertices per simplex (dimension ≤4) |
| Labels and coordinates | String vertex labels 1–80 characters; integer labels within JavaScript's safe range; finite coordinate magnitude ≤10¹² |
| Assessment work | Cooperative 8-second budget, checked throughout the calculation; limit responses ask for a smaller complex |
| Supplied animation | 120 frames; finite frame values with magnitude ≤10¹² |
| Candidate | 4,096 operations per piece per request |
| Catalog page | 1–200 rows, at most 20,000 operations across the displayed page; decimal rank inputs up to 30,000 digits |
| Explorer CSV import | 1,000 rows, 100,000 operations total, 2,000,000 characters |
| Notebook | 100 records, 9 MB serialized records; imports capped at 10 MB |

These are resource bounds, not theoretical repetition limits. Long words may require a one-row page. Catalog generation is direct and paginated; no infinite table or full triple product is materialized. Larger work must be split into bounded requests; completed reports can be exported and resumed as separate requests. Interrupting a browser request does not guarantee immediate server cancellation; the server's calculation budget remains in effect.

There is no durable server storage for research candidates or results. Function-local files and process memory are not a persistence layer. Export the workspace/results to retain data, assumptions and versions, and import them to continue. Any browser-local saved state is device-specific and may be cleared; it is not shared server storage. The research API follows this application's existing public-access model and adds no authentication system.

Imported reports are archived for export and must be rerun before supplying active evidence or highlights. Browser-local completed reports are restored only when their saved inputs match the candidate and geometry and their report shape passes validation. The queue retains completed records and resumes pending records, with explicit per-request limits. Browser interruption stops receiving a result; server work remains bounded by its 8-second budget.

`vercel.json` sets a 30-second function maximum. The current official Fluid Compute defaults are 2 GB memory and a 300-second duration (larger plan-dependent limits exist); the application does not request paid infrastructure or increased memory. No function-local files hold results.

## Run and verify

From the repository root, using Python 3.12 for application dependencies:

```sh
python -m pip install -r requirements.txt -r requirements-dev.txt
python -m flask --app src.app run --host 127.0.0.1 --port 5000
```

Open `http://127.0.0.1:5000/research`. Focused checks:

```sh
node --test tests/research/catalog.test.mjs tests/research/visualization.test.mjs tests/research/notebook.test.mjs tests/research/batch.test.mjs
python -m pytest -o addopts='' tests/unit tests/integration tests/research
```

`node tests/research/visualization.browser.cjs` exercises the SVG view in Chromium/Edge when Playwright is available. Set `NODE_PATH` to its installed package directory if needed and `EDGE_PATH` when the browser is elsewhere. Run `python -m pytest` for the repository's complete configured suite and coverage gate; focused checks do not replace that gate.

`node tests/research/workspace.browser.cjs` runs the end-to-end research workflow against `RESEARCH_BASE_URL` (default `http://127.0.0.1:5055`). It checks selection/import, assessment, controls, notebooks, queue interruption/resume, desktop/mobile rendering and absence of browser errors. The unchanged `origin/main` baseline has three unit/integration assertions passing, but only 36.29% repository-wide coverage against its existing 80% threshold. That pre-existing gate is not weakened by this implementation.

Catalog tests exhaustively check all 33,825 bounded words, rank/ID round trips, repetitions, large ranks, both triple orders, Unicode/quoted CSV, malformed CSV rejection, and operational budgets. Python controls and visualization checks establish only their documented properties; successful tests do not validate the 4D-NOD physical hypothesis.
