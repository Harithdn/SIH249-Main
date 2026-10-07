# Screenshot capture guide

The root [`README.md`](../../README.md#screenshot-slots) reserves a gallery slot for each of the
screens below. The image embeds are already written into the README but **commented out**, because
this repository does not currently ship any UI screenshots and none should be improvised.

To publish a screenshot:

1. Capture the screen (instructions per screen below).
2. Save the PNG in this directory using the exact file name in the table.
3. Open the matching `<details>` block in `README.md` and uncomment the `![...]` line beneath the
   caption.

## How to capture

1. Start the application: `docker compose up --build`, or run the backend and frontend as described
   in the README's [Quick start](../../README.md#quick-start).
2. Use a desktop viewport at **1600 × 1000** or wider — the console is a dense, wide operations UI
   and the layout is designed for large screens.
3. Use a light theme (the console is light-only) and the default zoom level.
4. Do **not** crop out the left navigation or the top system bar: they carry the simulation state,
   the model version and the data-mode indicator, which are part of what the screenshot explains.
5. Keep the data source indicator and the provenance labels visible, so it is clear the screenshots
   show synthetic data.
6. Save as PNG, optimise if the file exceeds ~1 MB, and keep the arrow/labels out of the image —
   put explanation in the README caption instead.

## Files the README expects

| File | Route / action | What should be visible |
|---|---|---|
| `01-command-center.png` | `/app` | Readiness KPIs, status board grouped by base, active events, availability trend |
| `02-aircraft-workspace.png` | `/app/aircraft/AS-014` | Aircraft header, workspace tabs, subsystem health matrix, maintenance timeline |
| `03-diagnostics.png` | `/app/aircraft/AS-014/diagnostics` **after** pressing *Degrade AS-014* | Predicted failure, feature contribution bars, RUL projection, active anomalies |
| `04-digital-twin.png` | `/app/aircraft/AS-014/twin` | Schematic with a subsystem mode selected, live-state markers, component inspection panel |
| `05-work-orders.png` | `/app/work-orders` | Stage counts, work-order register, create form, embedded schedule |
| `06-predictions.png` | `/app/predictions` | Fleet prediction table with severity filter and one expanded reasoning row |
| `07-recommendations.png` | `/app/recommendations` | Recommendation queue with parts, technician, slot, confidence and basis |
| `08-inventory.png` | `/app/inventory` | Parts register with risk states, spares forecast and stock trajectory |
| `09-analytics.png` | `/app/analytics` | Availability history/projection, reactive vs predictive posture, reliability indicators |
| `10-digital-thread.png` | `/app/thread` | The thirteen pipeline stages with the current prediction positioned in them |
| `11-system.png` | `/app/system` | Service status, data-quality indicators, environment information |
| `12-model-performance.png` | `/app/models` | Model registry cards with recorded demo metrics and the retraining control |

If you add a screen that the README does not describe, add both the caption and the file to this
table so the two stay in step.
