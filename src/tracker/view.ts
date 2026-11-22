import {
    debounce,
    ExtraButtonComponent,
    ItemView,
    WorkspaceLeaf
} from "obsidian";
import {
    BASE,
    CREATURE,
    CREATURE_TRACKER_VIEW,
    INITIATIVE_TRACKER_VIEW
} from "../utils";

import type InitiativeTracker from "../main";

import App from "./ui/App.svelte";
import type { Creature } from "../utils/creature";
import { PLAYER_VIEW_VIEW } from "../utils/constants";
import type PlayerView from "./player-view";

export default class TrackerView extends ItemView {
    ui: App;

    constructor(public leaf: WorkspaceLeaf, public plugin: InitiativeTracker) {
        super(leaf);
        if (this.plugin.data.state?.creatures?.length) {
        } else {
        }
    }
    async onOpen() {
        this.ui = new App({
            target: this.contentEl,
            props: {
                plugin: this.plugin
            }
        });
        this.ui.$on("player-view", () => this.openPlayerView());
    }
    async onClose() {
        this.ui?.$destroy();
    }
    getViewType() {
        return INITIATIVE_TRACKER_VIEW;
    }
    getDisplayText() {
        return "Initiative Tracker";
    }
    getIcon() {
        return BASE;
    }

    //legacy Leaflet support...
    get pcs(): Creature[] {
        return [];
    }
    get npcs(): Creature[] {
        return [];
    }

    //open player view
    playerViewOpened = false;
    getExistingPlayerView(): PlayerView | undefined {
        const existing =
            this.plugin.app.workspace.getLeavesOfType(PLAYER_VIEW_VIEW);

        if (existing.length) {
            return existing[0].view as PlayerView;
        }
    }
    async getPlayerView(): Promise<PlayerView> {
        const existing = this.getExistingPlayerView();
        if (existing) {
            this.app.workspace.revealLeaf(existing.leaf);
            return existing;
        }

        const leaf = this.app.workspace.getLeaf("window");
        await leaf.setViewState({
            type: PLAYER_VIEW_VIEW
        });
        await this.app.workspace.setActiveLeaf(leaf, { focus: true });
        return leaf.view as PlayerView;
    }
    async openPlayerView() {
        await this.getPlayerView();
        this.playerViewOpened = true;
    }
}

export class CreatureView extends ItemView {
    buttonEl = this.contentEl.createDiv("creature-view-button");
    statblockEl = this.contentEl.createDiv("creature-statblock-container");
    private currentCreatureId: string | null = null;
    private currentCreatureName: string | null = null;
    private bestiaryUnload: (() => void) | null = null;
    private unmountDetails: (() => void) | null = null;
    constructor(leaf: WorkspaceLeaf, public plugin: InitiativeTracker) {
        super(leaf);
        this.load();
        this.containerEl.addClass("creature-view-container");
        this.containerEl.on(
            "mouseover",
            "a.internal-link",
            debounce(
                (ev) =>
                    this.app.workspace.trigger("hover-link", {
                        event: ev,
                        source: INITIATIVE_TRACKER_VIEW,
                        hoverParent: this,
                        targetEl: ev.target as HTMLElement,
                        linktext:
                            (ev.target as HTMLAnchorElement).dataset.href ??
                            ""
                    }),
                10
            )
        );
        this.containerEl.on("click", "a.internal-link", (ev) =>
            this.app.workspace.openLinkText(
                (ev.target as HTMLAnchorElement).dataset.href,
                "initiative-tracker"
            )
        );
    }
    onload() {
        new ExtraButtonComponent(this.buttonEl)
            .setIcon("cross")
            .setTooltip("Close Statblock")
            .onClick(async () => {
                await this.render();
                this.app.workspace.trigger("initiative-tracker:stop-viewing");
            });
    }
    onunload(): void {
        this.unmountDetails?.();
        this.unmountDetails = null;
        if (this.bestiaryUnload) {
            this.bestiaryUnload();
            this.bestiaryUnload = null;
        }
        this.app.workspace.trigger("initiative-tracker:stop-viewing");
    }
    getState(): Record<string, unknown> {
        return {
            creatureId: this.currentCreatureId,
            creatureName: this.currentCreatureName
        };
    }
    async setState(
        state: Record<string, unknown>,
        result: import("obsidian").ViewStateResult
    ): Promise<void> {
        const id =
            typeof state?.creatureId === "string" ? state.creatureId : null;
        const name =
            typeof state?.creatureName === "string"
                ? state.creatureName
                : null;
        if (!id && !name) {
            this.currentCreatureId = null;
            this.currentCreatureName = null;
            await this.render();
            await super.setState(state, result);
            return;
        }

        this.currentCreatureId = id;
        this.currentCreatureName = name;
        const tryRestore = async () => {
            const ordered = this.plugin.tracker.getOrderedCreatures();
            const creature =
                (id
                    ? ordered.find((c) => c.id === id)
                    : undefined) ??
                (name
                    ? ordered.find((c) => c.name === name)
                    : undefined) ??
                (name
                    ? this.plugin.playerCreatures.get(name)
                    : undefined) ??
                (name
                    ? this.plugin.getCreatureFromBestiary(name)
                    : undefined);

            if (creature) {
                try {
                    await this.render(creature);
                } catch (error) {
                    console.error(
                        "Failed to restore creature view",
                        error
                    );
                }
                return;
            }

            this.currentCreatureId = null;
            this.currentCreatureName = null;
            state.creatureId = null;
            state.creatureName = null;
            await this.render();
        };

        if (
            this.plugin.canUseStatBlocks &&
            !window["FantasyStatblocks"].isResolved()
        ) {
            this.statblockEl.empty();
            this.statblockEl.createEl("em", {
                text: "Loading bestiary\u2026"
            });
            const unload = window["FantasyStatblocks"].onResolved(() => {
                this.bestiaryUnload = null;
                void tryRestore().finally(unload);
            });
            this.bestiaryUnload = unload;
        } else {
            await tryRestore();
        }

        await super.setState(state, result);
    }
    async render(creature?: Creature) {
        this.unmountDetails?.();
        this.unmountDetails = null;
        this.currentCreatureId = creature?.id ?? null;
        this.currentCreatureName = creature?.name ?? null;
        this.statblockEl.empty();
        if (!creature) {
            this.statblockEl.createEl("em", {
                text: "Select a creature to view it here."
            });
            return;
        }

        this.unmountDetails = this.plugin.attachCombatantDetails(creature, this.statblockEl, this);
    }

    getDisplayText(): string {
        return "Combatant";
    }
    getIcon(): string {
        return CREATURE;
    }
    getViewType(): string {
        return CREATURE_TRACKER_VIEW;
    }
}
