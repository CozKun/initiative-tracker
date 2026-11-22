import { Component, MarkdownRenderer, parseLinktext, resolveSubpath } from "obsidian";
import type InitiativeTracker from "src/main";
import type { Creature } from "src/utils/creature";

export function mountCombatantDetails(plugin: InitiativeTracker, creature: Creature, target: HTMLElement, owner: Component) {
    const child = owner.addChild(new Component());
    let mounted = true;

    async function render() {
        const fsb = plugin.canUseStatBlocks ? window.FantasyStatblocks : undefined;
        if (!creature["statblock-link"] || (fsb && !plugin.data.preferStatblockLink)) {
            if (fsb) child.addChild(fsb.render(creature.creature, target, creature.display));
            else target.createEl("p", { text: "This creature has no linked statblock. Add a statblock link or enable Fantasy Statblocks." });
            return;
        }

        let link = creature.getStatblockLink();
        if (fsb?.isStatblockLink?.(link)) link = fsb.parseStatblockLink(link);
        link = link.match(/\[.+?\]\((.+?)\)/)?.[1] ?? link.match(/\[\[(.+?)(?:\|.+?)?\]\]/)?.[1] ?? link;
        const { path, subpath } = parseLinktext(link);
        const file = plugin.app.metadataCache.getFirstLinkpathDest(path, creature.path || "/");
        if (!file) {
            target.createEl("p", { text: `Could not find the linked statblock for ${creature.getName()}.` });
            return;
        }
        let content = await plugin.app.vault.cachedRead(file);
        if (!mounted) return;
        if (subpath) {
            const result = resolveSubpath(plugin.app.metadataCache.getFileCache(file), subpath);
            if (result) content = content.slice(result.start.offset, result.end?.offset);
        }
        await MarkdownRenderer.render(plugin.app, content, target.createDiv("markdown-rendered"), file.path, child);
    }
    void render().catch((error) => {
        if (!mounted) return;
        console.error("Failed to render creature details", error);
        target.createEl("p", { text: "Could not open the statblock." });
    });
    return () => { mounted = false; owner.removeChild(child); };
}
