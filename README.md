# Initiative Tracker — Community Edition

A community fork of Initiative Tracker for **[Obsidian](https://obsidian.md)**, maintained by **[CozKun](https://github.com/CozKun)** and focused on running combat at the table: quick HP changes, clearer encounter planning and colour indicators for telling your miniatures apart.

**[Download the latest release](https://github.com/CozKun/initiative-tracker/releases/latest)** · **[Changelog](CHANGELOG.md)** · **[Report an issue](https://github.com/CozKun/initiative-tracker/issues)**

## Credit where it belongs

This edition builds on the work of **Jeremy Valentine (Javalent)** and the **Obsidian TTRPG Community contributors**. They created the initiative tracking, encounter building, saved encounters and integrations that make this fork possible. Thank you for the considerable work that went into the original.

* [Original Initiative Tracker repository](https://github.com/Obsidian-TTRPG-Community/initiative-tracker)
* [Original documentation](https://plugins.javalent.com/it) — useful for shared features; Community Edition controls may differ.
* [Support Jeremy's work](https://www.buymeacoffee.com/valentine195)

This is an independently maintained fork, not an official release or endorsement from the original maintainers. Please report Community Edition issues **in this repository**. The original [GNU GPL v3 licence](LICENSE) is retained.

## What Community Edition adds

### Faster combat at the table

* **Quick Damage/Heal:** click HP, enter an amount and press Enter. Escape or an outside click cancels. Clicking another creature's HP switches the target, making a misclick easy to correct.
* **Separate effects:** saving throws, resistance, conditions, temporary/max HP and multipliers remain available through **Apply effect…**, **Add targets** and the creature's context menu.
* **Mini Colour Indicators:** identify individual creatures using bases, rings, tokens or other coloured markers. The picker remembers your last eight colours and includes **No colour**.
* **Compact tracker layout:** a drag-order lock, flexible name column and compact difficulty display keep useful information close at hand. Right-click a creature for its additional actions.

### Clearer encounter planning

* **D&D 5.5e difficulty:** Trivial, Low, Moderate and High bands use the revised party thresholds and enemy XP without a creature-count multiplier. The builder shows bracket ranges and the XP needed to move into the next or previous bracket; the tracker stays compact.
* **Individual copies within groups:** multiple creatures appear as nested copies, each with its own colour and remove control. Colours survive saving, loading, copying encounter blocks and starting the tracker.
* **Visible XP:** a sortable bestiary XP column, XP per creature and group totals make encounters easier to compare.
* **Refreshed party controls:** include or exclude named characters, manage groups by player count and level, and choose saved parties. The panel remembers whether you left it expanded.
* **Consistent headings and tooltips:** explanatory help stays on relevant controls, with styling that follows the active theme.

The existing tracker, saved encounters, encounter blocks and integrations remain available. See the [changelog](CHANGELOG.md) for the full history. **13.0.23** is the first stable Community Edition release; its numbering continues the upstream version line.

## Next release: beta validation

The `13.0.24-beta.2` candidate adds group healing, movable effect/save panels, ad hoc allies and players, player-view colours, colour-independent shared initiative, and touch-oriented controls. It also extends difficulty bands to the six existing calculators: D&D 5e, D&D 5.5e, Lazy GM, CR2.0 Simple, Flee, Mortals! and Pathfinder 2e. These are encounter calculators, not complete combat rules automation.

The stable download instructions below still describe **13.0.23**. The beta has a separate plugin identity and must not be enabled alongside stable. Updating beta means replacing only its three release files; preserve its `data.json`.

**Validation boundary:** automated Chromium checks include touch emulation, narrow layouts and simulated software-keyboard viewport changes. Actual iOS/iPadOS and Android Obsidian testing is still required. Follow the [release UAT checklist](UAT-13.0.24.md) and report the device, OS, Obsidian version, theme, selected calculator and reproduction steps.

Calculator limitations still under review before stable promotion:

* PF2e uses the inherited rounded-average party level for mixed-level parties; creature XP is supported within four levels of that party level. Unsupported levels are marked unavailable. Simple hazards and variant rules are not newly certified by this beta.
* Flee, Mortals! retains the inherited minion-group rounding and the plugin's estimated Extreme budget. Its published-book coverage, partial minion groups and custom statblock persistence require additional UAT.
* CR2.0's decimal CR values now match the existing fractional entries. This fixes inconsistent inputs; it is not an independent certification of every inherited table value.

## Install manually

Community Edition is distributed through **GitHub Releases**. It is **not listed in Obsidian's Community plugins directory**; installing the directory's original Initiative Tracker does not install this fork.

Requires **Obsidian 1.7.2 or newer**. This release has been tested on desktop; the new controls have not been validated on mobile, and some creature actions use right-click.

1. Download **`coz-initiative-tracker-13.0.23.zip`** from the [latest release](https://github.com/CozKun/initiative-tracker/releases/latest). Choose the named plugin ZIP, not GitHub's automatic **Source code** archives.
2. Close Obsidian. Open your vault's `.obsidian/plugins/` folder; create `plugins` if necessary. Your file manager may hide `.obsidian`.
3. Extract the ZIP into `plugins`. The final layout must contain:

   ```text
   Your Vault/
     .obsidian/
       plugins/
         coz-initiative-tracker/
           main.js
           manifest.json
           styles.css
   ```

   Avoid an extra nested plugin folder. Alternatively, download the three individual release assets and place them directly in `coz-initiative-tracker`.
4. Reopen Obsidian. In **Settings → Community plugins**, turn off Restricted mode if necessary, then enable **Initiative Tracker Community Edition**.
5. Open the command palette and choose **Open Initiative Tracker** or **Open Encounter Builder** under this plugin.

### Updating or switching editions

Close Obsidian and replace `main.js`, `manifest.json` and `styles.css` with the new release files. **Keep `data.json`**: it contains your settings and saved state. Back up the plugin folder before updating. Updates are manual for now.

The stable plugin ID remains `coz-initiative-tracker`, so existing private Community Edition installations update in place even though the displayed name has changed.

The original plugin, Community Edition and the beta use separate folders and settings. Disable the original and beta before enabling this release: they share view types and encounter-block handling, so running several editions together can conflict. Installation does not automatically migrate their settings or encounters.

To carry beta settings and encounters over, back up both plugin folders, close Obsidian, then copy the beta's `data.json` into `coz-initiative-tracker`. This replaces the stable edition's existing saved state.

## Getting started

Open the encounter builder, configure your party, add creatures and assign colours to individual copies. Start the encounter when ready. In the tracker, click HP for quick damage or healing; right-click a creature for additional actions.

Select **D&D 5.5e** in the plugin's RPG system setting for the new difficulty bands. Other supported systems keep their own calculations.

You can also launch encounters from a note:

````yaml
```encounter
name: Goblin ambush
creatures:
  - 3: Goblin
```
````

Use creature names available in your bestiary. [Fantasy Statblocks](https://github.com/javalent/fantasy-statblocks) supplies bestiary integration, and [Dice Roller](https://github.com/javalent/dice-roller) provides integrated dice rolling when installed. See the [original documentation](https://plugins.javalent.com/it) for the wider encounter syntax and shared features.

## Feedback and development

[Open an issue here](https://github.com/CozKun/initiative-tracker/issues) with your plugin version, Obsidian version, theme and reproduction steps. Screenshots are useful for layout issues.

To build from source with Node.js 20 and npm:

```sh
npm ci
npm run build:stable
```

Installable files are written to `dist/stable/coz-initiative-tracker/`. The source is available under [GPL v3](LICENSE); upstream history and attribution are preserved.
