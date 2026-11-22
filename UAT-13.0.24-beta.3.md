# Initiative Tracker 13.0.24-beta.3

- The Encounter Builder keeps the name, party and creature colours together in its local workspace draft. Saved encounters carry the selected roster, exclusions and per-copy colours. New planning groups count towards difficulty by default. Opt in to make temporary tracker players.
- Starting or loading an encounter uses its saved roster. Switching the tracker’s active party keeps combat state for returning players. Matching creatures share a roll when shared initiative is enabled, with one row and colour per copy.
- Both views use the same encounter library. Search by name, see the number of combatants and saved date, and confirm overwrites and deletions.
- Apply Effect opens statblocks inside the panel. Switch between creatures and return to the draft. On touch screens the panel follows the visible viewport, with a scrollable body and a separate action footer.
- External settings reload while the plugin is open. Writes preserve incoming edits to other saved encounters. A saved encounter and the active combat snapshot each form a single unit, so simultaneous edits to the same encounter require care. Verify across both physical devices against the same beta and synced vault.

Use `npm.cmd run build:beta`, then `npm.cmd run test:beta -- <Playwright index.mjs>`. Set `UAT_VAULT` to include private fixture checks. The runner uses headless Chrome. It simulates viewport events for software keyboards and stubs Obsidian and Fantasy Statblocks host APIs.

The disposable vault’s `06 - Beta 3 retest.md` covers the builder roster, tablet keyboard and device-to-device colour sync. Live acceptance remains pending. Older saves can contain an already-created non-player duplicate. Review it in the builder before deleting the row, since a monster can legitimately share a player’s name.
