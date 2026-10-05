# MultiChoice behavior contract

These expectations are implementation-independent and should remain valid if the
Lit view is replaced later.

- `getCurrentState()` returns `{ answers: number[] }` using original answer indexes,
  including when display order is randomized.
- `getMaxScore()` returns the content weight for single-answer and single-point
  tasks; otherwise it returns the sum of correct-answer weights, or the content
  weight when a blank answer is correct.
- Multi-answer scoring adds selected correct weights, subtracts selected incorrect
  weights, clamps at zero, and applies pass-percentage all-or-nothing scoring for
  single-point tasks.
- Single-answer mode permits exactly one selected answer and supports arrow-key
  navigation plus Space/Enter selection.
- Checking disables input, reports per-answer correctness and overall feedback,
  and emits an H5P `answered` xAPI event.
- Showing the solution marks every answer as should-check/should-not-check and
  disables input.
- Retry resets selections and evaluation state; randomized tasks may receive a
  new display order while saved state remains in original-answer coordinates.
- Tips are keyboard accessible, do not select an answer, and expose their open
  state through `aria-expanded`.
