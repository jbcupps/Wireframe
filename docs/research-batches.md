# Automated research batches

Use **Batch runner** on `/research` to generate a finite range of ordered A/B/C candidates and process it while the page remains open.

1. Choose the bounded slice or unbounded index, a zero-based starting row rank, and a batch size.
2. Choose symbolic inputs, or match explicitly supplied geometries from saved notebook entries.
3. Use **Prepare batch** to inspect the inputs before execution, or the generate-and-run control to start immediately.
4. Pause at any time. Completed reports are saved after each request. Reopen the page and resume the saved batch to process its remaining entries.
5. Export a JSON checkpoint to retain the complete inputs, model versions, and evidence. CSV provides a qualified comparison table. Automatic JSON export can run when the batch completes.

Geometry matching uses the complete ordered candidate ID. It does not apply the currently displayed control to every generated word. If two saved entries assign different geometries to the same candidate, batch preparation stops so the researcher can resolve the ambiguity. Candidates without an explicit geometry remain **not tested**; processing them does not establish geometry or particle properties.

The unbounded catalog still uses a finite batch size: 1–100 records, within the notebook's total 100-record and 9 MB budgets. Bounds, request sizes, calculation time, and browser storage are enforced. A finite range extending past the selected slice is rejected rather than silently shortened. Failures stop the run and retain the completed evidence. A request that exceeds 45 seconds is interrupted and left pending for explicit retry. Browser interruption can stop receiving a response without immediately stopping the bounded server calculation.

This feature runs in the open browser page. It does not create a scheduled background worker or durable server database. Browser storage can be cleared or fill up; keep exported checkpoints for durable retention. If storage fails during a run, export the in-memory checkpoint before closing the page.

Imported reports remain archived and exportable. Resume recomputes them before treating them as active evidence. Valid reports restored from this browser's local checkpoint are reused only when their inputs match and their report shape passes validation.

## Verification

With the application running, execute:

```sh
node tests/research/batch.browser.cjs
```

The default base URL is `http://127.0.0.1:5055`; set `RESEARCH_BASE_URL` to change it. Set `NODE_PATH` to the Playwright package directory and `EDGE_PATH` if the browser executable is elsewhere. The test covers exact candidate identity, geometry assignment, qualified export, checkpoint import, pause/resume, resource errors, storage failures, and mobile layout.
