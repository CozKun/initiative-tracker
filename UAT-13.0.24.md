# Public release UAT — 13.0.24 candidate

Prepared 26 September 2026. Candidate: 13.0.24-beta.2 (built on beta.1 commit e15fbe2).

Status: **NOT signed off for public release.** The production build and 54 automated browser checks passed. These do not prove live Obsidian behaviour, all six rules calculations, or real mobile usability. Every checkbox below starts untested.

Use PASS / FAIL / BLOCKED / N/A with tester, device, Obsidian version, theme, plugin version and evidence. An unchecked item is not a pass. Record a reason for N/A.

## 1. Prepare a repeatable test

- [ ] Use a disposable test vault copied from representative data. Back up data.json; enable only one tracker edition at a time.
- [ ] Keep both a clean-install fixture and an upgrade fixture from stable 13.0.23.
- [ ] Create four differently coloured copies of one enemy with identical initiative modifiers, another copy with a different modifier, an ally, two players, a hidden enemy and one fixed initiative of zero.
- [ ] Include a long creature name, a custom statblock, a custom condition, temporary HP and a saved encounter with individual colours.
- [ ] Record baseline HP, AC, initiative, active turn, round, colours, conditions, party, encounter names and relevant settings.
- [ ] Use a second fixture with 30–50 creatures to expose scrolling, selection and performance problems.

## 2. Table-play acceptance — run on desktop, tablet and phone

### Quick HP
- [ ] Tap A's HP, then B's HP, enter 7 damage: only B changes. Repeat after opening and cancelling Apply effect.
- [ ] Damage consumes temporary HP correctly; healing respects maximum HP. Zero, fractions, empty and invalid input behave predictably.
- [ ] Cancel, outside tap and Escape where available leave HP unchanged. Double-tapping Apply must not apply the amount twice.
- [ ] After scrolling or rotating, the controls still belong to the intended creature and remain reachable.

### Apply effect
- [ ] Select four targets and deal 12 damage: normal takes 12, Saved takes 6, Resist takes 6, both take 3. Verify multipliers 0, 0.5, 1 and 2 and configured rounding behaviour.
- [ ] Heal two creatures from 5/30 and 6/30 by 12 each: expect 17/30 and 18/30. Override the second amount to 4: expect 17/30 and 10/30 from the same starting state.
- [ ] Saved/Resist cannot accidentally reduce healing. Switching modes clears inappropriate damage controls and individual overrides.
- [ ] Open a target statblock while drafting an effect, inspect it and return: targets and entered amounts remain intact. Repeat in a narrow/mobile layout.
- [ ] Add/remove targets using checkboxes; target-name taps open details without changing target selection.
- [ ] Grant/remove temporary HP under each stacking option. Increase/decrease maximum HP and check both maximum and current HP behaviour against the existing contract.
- [ ] Apply and remove standard and custom conditions, including conditions restored from an older save. A successful save skips condition application where intended.
- [ ] Adjust and set AC, including a creature whose AC is descriptive text. Invalid values must not corrupt the creature.
- [ ] Move the panel; scroll a long target list; reach Apply, Cancel and Close with the software keyboard open. Cancel must never partially apply a draft.

### Unconscious recovery
- [ ] Default-off setting retains Unconscious after healing.
- [ ] With both automatic application and recovery enabled, damage to zero applies Unconscious; healing above zero removes it.
- [ ] Temporary HP alone, zero healing and maximum HP changes that leave current HP at zero do not remove it.
- [ ] Manually applied Unconscious remains; unrelated conditions remain. Manually removing/reapplying the automatic condition makes it manual.
- [ ] Save/reload at zero HP, then heal: automatic provenance survives. Old saves with unknown provenance are treated conservatively.
- [ ] With automatic conditions disabled, damage/healing introduces no D&D-specific status unexpectedly.

### Initiative, allies and adding combatants
- [ ] Roll the four coloured copies together: same initiative, four separate rows, colours unchanged.
- [ ] Different modifiers and ally/enemy roles stay separate. Players remain individual. Fixed initiative zero survives rerolls.
- [ ] Switching shared/individual initiative does not immediately alter existing values, active turn or round. The next explicit roll follows the selected mode.
- [ ] Reroll one creature deliberately; verify other creatures do not change silently.
- [ ] Add an enemy from bestiary, an ally, a saved player and a manually entered player. Test quantity, roll/manual initiative, zero and negative initiative.
- [ ] Add a new matching creature with shared rolls enabled; verify its chosen roll behaviour without changing existing combatants or the current turn.
- [ ] New combatants are encounter-only: saved party and bestiary remain unchanged. Cancel and invalid input add nothing.
- [ ] Existing creature editing, removal, next/previous turn, round counting, drag-order lock and reset still work.
- [ ] Allies have the existing icon plus bold names; this remains readable under both themes.

### Saving, builder and player view
- [ ] Save from the top of a long tracker: naming controls are immediately accessible. Cancel changes nothing; duplicate names require overwrite confirmation.
- [ ] Reload the saved encounter and restart Obsidian: each creature, colour, condition, initiative and setting restores as intended.
- [ ] Builder: add four copies, colour each, remove the middle copy and change quantity; remaining identities/colours stay correctly associated.
- [ ] Recent colours and No colour work in both builder and tracker and survive restart. Opening/cancelling does not add a recent colour.
- [ ] Save/load, copy encounter block and start combat preserve per-copy colours and party inclusion.
- [ ] XP sorting handles zero, missing XP and explicit XP. Per-creature/group values agree with quantity and the selected system's units.
- [ ] Player view shows the correct read-only colours, follows its own visibility setting and never exposes hidden creatures through rows, colours or tooltips.
- [ ] Player view updates HP/conditions/turns during play; check its available presentation mode on each device.

## 3. RPG-system matrix

The setting selects an encounter-difficulty calculator; it is not proof of full rules automation for each RPG. Test the shared HP, conditions, initiative, saving and colour flows with each selected calculator as well.

| Calculator exposed by the plugin | Display unit in current implementation | Particular checks | Result |
| --- | --- | --- | --- |
| D&D 5e | XP | Raw versus adjusted XP; creature-count and party-size adjustments; original threshold labels | Untested |
| D&D 5.5e | XP | Trivial/Low/Moderate/High bands; exact thresholds and distances; over-High display | Untested |
| DnD 5e Lazy GM | CR | CR budgets and two-state difficulty; do not label CR as XP | Untested |
| DnD 5e CR2.0 Simple | Power | Power conversion, fractional CR inputs and Power budgets; no XP substitution | Untested |
| DnD 5e Flee, Mortals! | CR | Party budgets, creature CR cap and cap-exceeded result | Untested |
| Pathfinder 2e | XP | Creature level relative to party; party-size changes; supported hazards; correct tier names | Untested |

For **each row**:

- [ ] Independently calculate and record expected values from the selected rules source/version. Include a source reference; do not derive the expected result from plugin code.
- [ ] Test no party, one player, four players, six players, disabled players, unnamed player groups and mixed levels. Unsupported input must be clear, not NaN or a misleading confident result.
- [ ] Test zero enemies, one enemy, several identical enemies and mixed enemies. Allies are excluded; hidden enemies still count.
- [ ] Test each threshold immediately below, exactly at and immediately above it using valid values for that system; include values above the highest tier.
- [ ] Check builder, compact tracker, summary, group totals and bestiary column for consistent values and units. Distinguish actual XP from CR/Power budgets.
- [ ] Compare with stable 13.0.23 using identical fixtures. Record any difference as intended change, regression or inherited bug; unchanged does not automatically mean rules-correct.
- [ ] Change systems with builder/tracker already open, then reopen/restart. No stale thresholds, units or creature values should remain.
- [ ] Use a native statblock for the system, missing optional fields and custom initiative modifiers. No unwanted CR assumptions or D&D-specific status automation.

Current scope: beta.2 provides system-specific bands for all six calculators. Calculator rules remain distinct; verify special boundaries, duplicate thresholds and Flee, Mortals! CR-cap overrides as well as ordinary totals.

## 4. Touch and responsive acceptance

Minimum evidence: real iPhone/iPad and Android phone/tablet coverage before claiming broad mobile compatibility; a desktop with mouse/keyboard remains required. Borrow community testers where hardware is unavailable. Label untested platforms honestly rather than treating browser emulation as device acceptance.

Test desktop full-width and narrow sidebar, phone portrait/landscape and tablet portrait/landscape. Use Obsidian Default light/dark and ITS D&D; repeat core flows at larger text sizing.

- [ ] Every essential action is available by tap: no requirement for hover, right-click, Ctrl/Cmd or a hardware keyboard. Long-press actions must be discoverable and must not conflict with scrolling/text selection.
- [ ] Buttons, colour swatches, increment/decrement and close controls can be selected reliably without hitting their neighbours. Aim for comfortable roughly 44–48 CSS-pixel touch areas; measure actual controls during the audit.
- [ ] Scroll a long tracker/bestiary without accidentally reordering, editing HP or opening a colour picker. Deliberate dragging works, and the lock prevents it.
- [ ] Open each input with the software keyboard visible: focused field, validation, Apply/Save and cancellation remain reachable. Test keyboard dismissal and returning to the draft.
- [ ] Rotate with a panel open, resize split-screen and switch apps then return: panels stay visible; no duplicate action or lost confirmed change.
- [ ] No page-wide horizontal scrolling for routine tracker actions. If a dense table scrolls internally, labels and controls remain understandable and reachable.
- [ ] Colour selection works with the device's native picker; clear/recent colours remain available without hover. Colour is not the sole way to identify a creature.
- [ ] Long names, large numbers and translated/custom condition names wrap without covering HP or action controls.
- [ ] Screen-reader names identify creature-specific buttons, mode/selection state and errors; desktop keyboard focus remains visible and ordered.
- [ ] Complete a 10-minute touch-only encounter: add creatures, roll, advance rounds, damage, group heal, open statblock, add condition, change colour and save. Record every friction point, even if technically functional.
- [ ] Test a larger encounter and bestiary on actual mobile hardware: no freezes, multi-second routine taps or repeated accidental actions. Record sizes and observed delays.

## 5. Installation, integrations and release gate

- [ ] Clean manual install works; upgrade replaces only release files and retains data.json. Beta/stable identities and version strings are correct.
- [ ] Reopen/restart without losing saved encounters, party, settings, colours or active combat state.
- [ ] With Dice Roller and Fantasy Statblocks enabled, rolls and statblocks work. With either absent/disabled, available manual/fallback flows are clear and do not crash.
- [ ] Test statblock-link/note-backed creatures as well as bestiary entries; opening details does not discard an effect draft.
- [ ] Verify release ZIP and standalone files match the tested candidate hashes. Any later code fix gets a rebuilt candidate and relevant retests.
- [ ] README/changelog describe actual supported systems/devices and known limitations, preserve upstream credit and explain installation/updates.
- [ ] No unresolved data loss, wrong-target updates, incorrect calculations in supported cases, hidden-information leaks, crashes or unreachable essential controls.
- [ ] Every failed test has a retest result or an explicitly agreed documented limitation. Inherited problems receive the same user-impact assessment as new ones.
- [ ] Coz approves the exact candidate for publication after live testing. This checklist does not authorise publication.

## 6. Code-audit leads — investigate, not confirmed device failures

1. `src/tracker/ui/floating-panel.ts`: bounds use window dimensions and resize events; no explicit visualViewport handling for the software keyboard.
2. `src/tracker/ui/Updating.svelte`: dense target table, numeric multiplier fields and several small controls need real finger/keyboard testing.
3. `src/tracker/ui/creatures/Creature.svelte`: mobile styling reduces HP/AC font size; assess readability and touch areas rather than assuming smaller is better.
4. `src/builder/view/encounter/Creature.svelte`: warning icons compare CR with average party level without a system-specific guard; calculator is captured at component creation. Check non-D&D meanings and live system switching.
5. `src/builder/stores/table/table.ts`: XP column uses system-derived XP for XP systems and explicit creature XP otherwise. Verify missing XP, PF2e party-relative values and clarity alongside CR/Power group totals.
6. `src/ui/DifficultyGauge.svelte`: enhanced bands only apply to D&D 5.5e. Other calculators need their own boundary and readability checks.

## Failure report template

Test ID/section:
Build / Obsidian version:
Device / OS / orientation / theme:
Selected RPG system / related settings:
Starting fixture:
Steps:
Expected:
Actual:
Screenshot or short recording:
Impact: release blocker / significant usability problem / cosmetic
Retest build and result:

## Beta.2 engineering evidence (not manual sign-off)

Implemented the six audit leads above: visualViewport-aware panels/popovers, mobile target cards and touch sizing, readable mobile HP/AC, reactive calculators and D&D-only CR warnings, system-specific bands and units. Added a tap-accessible creature menu and stable row identities.

Regression coverage includes all six calculators at levels 1/5/10/20, live system switching, decimal/fractional CR parity, preserved zero XP and level zero, bestiary fallback, strict Lazy GM boundaries, PF2e Low budgets for 2/3/4/6 players, coloured minion groups, unsupported input handling and CR-cap overrides. Touch testing uses Chromium emulation plus deterministic keyboard viewport events; it does not mark any physical device row passed.

Sources consulted for targeted rules checks:

- [PF2e GM Core encounter rules](https://2e.aonprd.com/Rules.aspx?ID=2716): creature-relative XP and party adjustments. Low uses a 20 XP character adjustment.
- [Sly Flourish Lazy Encounter Benchmark](https://slyflourish.com/the_lazy_encounter_benchmark.html): the Deadly comparator is strictly greater than the benchmark.

Remaining manual/rules gates: real iOS/iPadOS and Android runs; theme/integration/restart tests in Obsidian; all inherited calculator table values; very small and mixed-level parties; PF2e hazards/variants; Flee, Mortals! partial minion groups and source-data persistence. Record results before changing the release status.
