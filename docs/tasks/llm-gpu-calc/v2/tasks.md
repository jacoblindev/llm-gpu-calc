# Tasks: UI/UX Refresh (v2) — Option A

Slug: llm-gpu-calc
Parents only; pause for confirmation before sub‑tasks.

---

0.0 Scaffolding

- Create preview panel component scaffold (reusing existing bar component logic from App).
- Wire preview visibility to GPU selection state.
- Add top bar (title, theme/unit toggles) with persisted prefs.

1.0 Results Preview (bars) in Guided Flow

- Render per‑GPU bars in a sticky preview panel after GPU selection.
- Ensure labels appear for segments ≥10% width; tooltips/ARIA for smaller segments.
- Keep performance within 16 ms updates for typical scenarios.

2.0 Recommendations in Context

- Surface per‑deployment suggestions (`--max-model-len`, `--max-num-seqs`) within the preview for the active deployment.
- Add adjustable controls seeded with suggestions:
  - `max_num_seqs`: +/- step 1, min 1; numeric input.
  - `max_model_len`: +/- default step 128; numeric input.
- Apply action uses the adjusted value (respect min/step and safety factor) via App function or direct state set.

3.0 Visual Language & Tokens

- Tune `src/styles/tokens.css` to muted, high‑contrast palette; simplify borders; refine spacing/typography.
- Verify dark/light contrast (WCAG AA) and hover/focus transitions (150–200 ms).

4.0 Accessibility & Keyboard Nav

- Define focus order to avoid traps; Left/Right navigation across segments.
- Add `aria-label` text equivalents for segments and preview status.

5.0 Fit/Warnings Surface in Preview

- Show ΣU, implied reserve, and fit status per GPU; display warnings/errors as concise, non‑intrusive notices.

X.0 Align & prune tests

- Update UI smoke tests to cover preview, keyboard nav, and Apply actions.
- Update/remove obsolete tests as behavior/UI structure changes; keep runtime reasonable.

Gates (each parent)

- Tests: Public behavior covered; obsolete tests updated/removed in same PR.
- Boundaries: Imports respect latest `docs/architecture/ARCH-v2.md` and public APIs; deviations documented (ADR/update ARCH).
- Dependencies: Any new runtime dep requires a short ADR under `docs/adr/`.

Notes

- No backend; domain formulas untouched.
- Consider adding a Canvas mode toggle later (separate parent).
