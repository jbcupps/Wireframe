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

## Prepared workbook examples

Prepared notebook JSON can also carry an explicit ordered candidate list. These batches preserve the workbook's supplied A/B/C examples rather than representing a contiguous range of generated triples. `indexing: explicit-list` carries an ordered candidate-ID manifest, the starting list position, count, label and each record's list position. The candidate identity must match its manifest position. Spreadsheet provenance retains the original file hash, sheet, Excel row and source example ID. Display, selected-batch execution and export follow those list positions even if an imported checkpoint's records are reordered.

The 216 supplied workbook examples are packaged as three pending batches of 100, 100 and 16. To use them:

1. Export any existing notebook work you want to retain and make enough room for the selected file.
2. Choose **Import prepared notebook**, then select its named batch under **Prepared batches**.
3. Click **Run / resume selected batch**. **Generate & run** creates a new generated range and does not run the imported list.
4. Save the checkpoint JSON and results CSV. **Remove selected batch** asks for confirmation, removes only that batch, and leaves unrelated notebook entries intact. Removal is disabled while the batch runs.
5. Import the next file and repeat.

The supplied workbook examples have no geometry. Their prepared files contain null geometry and pending results; executing them reports **not tested / symbolic**. Existing archived reports are not promoted to active evidence. These examples are not the complete Cartesian product of the 33,825 individual configurations.

## Verification

With the application running, execute:

```sh
node tests/research/batch.browser.cjs
```

The default base URL is `http://127.0.0.1:5055`; set `RESEARCH_BASE_URL` to change it. Set `NODE_PATH` to the Playwright package directory and `EDGE_PATH` if the browser executable is elsewhere. The test covers exact candidate identity, geometry assignment, qualified export, checkpoint import, pause/resume, resource errors, storage failures, and mobile layout.

`node tests/research/prepared-workbook-batches.browser.cjs` independently compares all 216 prepared records with the original workbook, imports/runs/exports each part, and checks batch removal and source ordering. Set `BATCH_DIR` to the prepared files' directory and `RESEARCH_WORKBOOK_PATH` to the original workbook. User data files and browser evidence are not committed.
