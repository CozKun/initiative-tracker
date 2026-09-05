# Beta interaction checks

Run `npm run build:beta`, then `npm run test:beta` with Playwright available. If it is supplied by a separate runtime, pass its `index.mjs` path after `--`. The browser runner uses installed Chrome in headless mode.

The harness compiles the real creature row, colour picker, quick HP panel, effect panel, and tracker store. Only Obsidian's host adapters and condition suggestion popup are replaced. It uses synthetic Goblins and isolated browser storage; it never opens or edits a vault.

Checks cover target replacement after a misclick, cancellation, damage/healing, temporary HP, invalid input, explicit group targets and saving throws, condition-only updates, stale effect drafts, recent colour reuse/clearing/persistence, and popup bounds. Beta.3 adds zero/fractional/invalid multiplier checks, real difficulty boundaries across levels 1–20 and mixed parties, High over-budget display, removal of party levels, and the legacy meter for other RPG systems. Screenshots are written to `dist/beta-qa`.

Live Obsidian acceptance: disable Coz Initiative Tracker, enable Coz Initiative Tracker Beta, and try the same interactions in the beta's own encounter. Confirm the actual theme, right-click menu, condition suggestions, and detached windows. The two plugins share view identifiers, so enable one at a time. The installed beta's `data.json` is preserved during deployment.
