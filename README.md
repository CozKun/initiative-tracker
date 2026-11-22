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

* **Quick Damage/Heal:** select a creature's HP and enter an amount. Desktop supports Enter and Escape. Touch screens have an in-app number pad for HP, initiative, AC, and other tracker numbers. Selecting another creature's HP switches the target.
* **Apply Effect:** handle group damage and healing, saving throws, resistance, conditions, temporary or maximum HP, and multipliers. Check statblocks inside the panel and return to your draft.
* **Mini Colour Indicators:** identify individual creatures using bases, rings, tokens or other coloured markers. The picker remembers your last eight colours and includes **No colour**.
* **Compact tracker layout:** a drag-order lock, flexible name column and compact difficulty display keep useful information close at hand. Right-click a creature on desktop, or focus its name and press Shift+F10. Tap the dots beside the name on a touch screen.
* **Saved encounters:** use the same searchable Save and Load library in the tracker and builder. Wait for your vault sync to finish before resuming an encounter on another device.

### Clearer encounter planning

* **Difficulty bands:** the builder shows ranges and the amount needed to reach a neighbouring bracket. The tracker keeps a compact view. Each calculator uses its own budgets and units.
* **Individual copies within groups:** multiple creatures appear as nested copies, each with its own colour and remove control. Colours survive saving, loading, copying encounter blocks and starting the tracker.
* **Visible XP:** a sortable bestiary XP column, XP per creature and group totals make encounters easier to compare.
* **Refreshed party controls:** choose a saved party, include or exclude named characters, and add groups for planning. Choose whether an unnamed group should also create temporary players in the tracker.
* **Consistent headings and tooltips:** explanatory help stays on relevant controls, with styling that follows the active theme.

See the [changelog](CHANGELOG.md) for the full history. Release numbering continues the upstream version line.

## Device and calculator coverage

The 13.0.24 beta passed targeted checks in desktop Obsidian and on an Android tablet. Automated checks exercise narrow layouts, touch controls and keyboard viewport changes. Native iOS and iPadOS coverage is still open.

Supported encounter calculators are D&D 5e, D&D 5.5e, Lazy GM, CR2.0 Simple, Flee, Mortals! and Pathfinder 2e. Combat rules are adjudicated at the table.

* PF2e uses the rounded average for mixed-level parties and supports creature XP within four levels of that party level. Hazards and variant rules remain outside the verified cases for this release.
* Flee, Mortals! retains the existing minion-group rounding and estimated Extreme budget. Partial minion groups and custom statblock persistence need more coverage.
* CR2.0 decimal CR values now match their fractional equivalents. Testing covers selected table values and boundaries.

## Install manually

Community Edition is distributed through **GitHub Releases**. It is **not listed in Obsidian's Community plugins directory**; installing the directory's original Initiative Tracker does not install this fork.

Requires **Obsidian 1.7.2 or newer**.

1. Download **`coz-initiative-tracker-13.0.24.zip`** from [Community Edition releases](https://github.com/CozKun/initiative-tracker/releases). Use the named plugin ZIP.
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

Open the encounter builder, configure your party, add creatures and assign colours to individual copies. Start the encounter when ready. In the tracker, select HP for quick damage or healing. Open creature actions with right-click on desktop or the dots on a touch screen.

Choose an RPG system in the plugin settings to use that calculator's difficulty bands and units.

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
