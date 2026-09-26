# Community Edition — next-build backlog

Play feedback collected on 20 September 2026. Approved scope implemented in 13.0.24-beta.1 on 26 September 2026; awaiting live beta validation before promotion to stable.

## Encounter saving

- [x] Keep encounter naming and saving accessible where the action is initiated. Currently, saving from the initiative tracker requires scrolling to the bottom of the panel to rename/save the encounter.

## Apply effect

- [x] Rethink the layout for easier use during play, bringing it in line with the quick Damage/Heal improvements while preserving all existing functionality.
- [x] Make group healing straightforward through Apply effect.
- [x] Let the creatures listed in Apply effect open their statblocks directly, so checking saving throws and other stats does not require finding each creature again in the tracker.

## Healing from zero HP

- [x] Add an option to automatically remove **Unconscious** when a creature is healed from 0 HP. Keep this configurable; do not assume every user wants automatic condition removal.

## Allies

- [x] Keep the existing ally icon and also display allies in bold in the tracker.

## Group rolls, grouping and expansion

- [x] Investigate the group-roll creatures function. Coz reported that it did not work during the **Escape** encounter, which had roughly four copies of each creature. Reproduced colour-based separation and fixed it: Mini Colour Indicators no longer split shared initiative rolls.
- [x] Examine what creature grouping and expanding currently do, how they relate to group rolls, and why the behaviour is confusing in play. Agreed: retain individual rows, label the controls as shared/individual initiative rolls, and never change existing initiatives merely by switching that setting.

## Add creature from the tracker

- [x] Improve the direct Add creature flow and bring its layout and controls in line with the refreshed plugin.
- [x] Allow ad hoc addition of a player or ally as well as an enemy.

## Player view

- [x] Show each creature's Mini Colour Indicator in player view too.

## Further play feedback

Append new observations here before deciding the next build's scope.

## Beta acceptance

- [ ] Validate the refreshed controls in live Obsidian and during table play.
- [ ] Confirm the Escape encounter rolls matching coloured copies together.
- [ ] Promote to stable only after beta acceptance.
