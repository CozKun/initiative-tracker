# Automated evidence — 29 September 2026

**58 automated interaction checks passed** against source candidate `c42edad1d7252ea895f8a40cfa3acc975c619ee3`, using real Svelte components and tracker logic in headless Chrome. Only tests/documentation changed during this audit; the beta.2 plugin binaries were not changed. Test-vault plugin hashes match the recorded files, and the tracker hashes match the packaged beta.2 files.

## Covered automatically

| Area | Evidence |
| --- | --- |
| Quick HP | Wrong-target switching; cancel/Escape/outside click; invalid input; temp HP absorption; healing cap; two immediate Apply clicks do not double-apply |
| Effects | Group healing and individual overrides; saves/resistance ignored for healing; all four saved/resist combinations at multipliers 0, 0.5, 1, 2; integer rounding; temp/max HP; custom condition removal |
| Unconscious | Automatic versus manual provenance, serialization, setting off, temp HP and deliberate manual condition preservation |
| Initiative/additions | Four coloured copies group; different modifiers/roles separate; fixed zero; mode toggle leaves current values intact; adding ally/player preserves active combat |
| Builder/save/colours | Per-copy identity through deletion, quantities, save/load, encounter-block parsing and tracker start; recent/clear/cancel; duplicate-save confirmation |
| Player view | Colour visibility setting and hidden-creature colour exclusion |
| Calculators | Six reference totals and units; live switching; display boundaries at levels 1/5/10/20; fractional CR; zero values; selected PF2e party adjustments, Lazy GM strict boundary and Flee Mortals cap/minion checks |
| Actual vault fixtures | 110 creature records across 12 encounters round-trip through production serialization with HP, AC, initiative, colours, conditions, flags and source paths preserved; native PF2e sample totals 120 XP |
| Responsive behaviour | Narrow panels, touch-emulated actions, a measured 44px Apply target, simulated keyboard viewport and rotation |

Full execution log: [[Fixtures/Automated checks 2026-09-29.log]]. These are 58 scenario checks, many containing multiple assertions, not 58 physical-device tests.

## What this does not prove

Obsidian APIs, FSB opening and storage are replaced by test adapters. Serialization success does not prove Obsidian restart or Syncthing behaviour. Browser touch emulation does not prove physical keyboards, native pickers, finger accuracy, WebView behaviour or actual ITS appearance.

Some calculator boundary tests check consistency with the plugin's own thresholds; they do not independently certify every inherited rules table. Complete table/source verification, small/mixed parties, PF2e hazards/variants and Flee Mortals partial minion/source persistence remain engineering work. Stable-to-beta upgrade testing and additional iOS/Android/accessibility coverage are also outstanding. None of those is silently signed off or assigned to Coz's short pass.

**Public release remains pending** those engineering decisions and live acceptance. Your only personal checklist is [[01 - Phone quick pass]].

## Reproduce

Run `npm run test:beta -- <Playwright index.mjs>`; optionally set `UAT_VAULT` to the private test-vault folder to include the two fixture checks. Without it, the portable suite contains 56 checks. Private fixture content is not checked into the repository. Test adapters and source compilation are described in `tests/README.md`.
