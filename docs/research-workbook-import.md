# Import the existing research workbook

The **Upload your spreadsheet** section on `/research` opens the existing 4D-NOD twist/loop `.xlsx` workbook. Choose a file, then choose a worksheet and page through its rows. The first-data-row control is one-based within that sheet's data; the table separately shows original Excel row numbers.

- **Configurations** exposes single-piece sequences. Choose A, B or C beside a row to use it in the builder.
- **Triple examples** exposes ordered three-piece candidates. Choose **Use triple**, or **Add displayed triples to notebook** to save the current page of up to 20 rows.
- **Scope and schema** and **Operation inventory** retain the workbook's reference text.
- **Show this page in catalog** copies the displayed candidate page into the existing catalog for inspection and selection.

Saved triples retain the original filename, workbook SHA-256, worksheet, Excel row and source ID. Canonical candidate IDs are derived from the supplied operation sequences; workbook labels such as `C0001` remain source references. Spreadsheet status text does not establish geometric or physical evidence. Imported candidates initially have no geometry or results.

Choose **Open saved notebook**, then **Assess pending records** to process saved triples. Without an explicitly supplied geometry, geometric checks remain **not tested**. Pause and resume use the existing notebook queue. Adding spreadsheet triples is disabled while that queue runs.

Export the notebook as JSON to retain candidate inputs, source references and reports. Browser-local storage preserves valid results on reload. Imported JSON reports are archived until recomputed. The workbook itself must be selected again after reopening the page; uploading it does not create a server-side workbook library.

Uploads are limited to 3,000,000 bytes and the `.xlsx` format. Older `.xls` files and macro-enabled workbooks are unsupported. Files are sent to the workbook service for bounded, request-only parsing. The notebook retains its existing 100-record and 9,000,000-byte limits, which may also be constrained by browser storage. Save selected rows and export a backup before leaving.

## Browser verification

With the app running, provide the actual workbook through an environment variable:

```sh
RESEARCH_WORKBOOK_PATH=/path/to/4D_NOD_twist_loop_tables.xlsx node tests/research/workbook.browser.cjs
```

Set `RESEARCH_BASE_URL` for a server other than `http://127.0.0.1:5055`, `NODE_PATH` for the Playwright package directory, and `EDGE_PATH` if Edge is installed elsewhere. The workbook is never committed with the tests. Coverage includes all four sheets, exact candidate identity and pagination, provenance, invalid uploads, queue exclusion, checkpoint export/import, browser restoration and mobile layout.
