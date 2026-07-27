import { Menu } from "obsidian";
import { DISABLE, ENABLE, HIDDEN, HP, REMOVE } from "src/utils";
import type { Creature } from "src/utils/creature";
import { tracker } from "src/tracker/stores/tracker";

export function showCreatureMenu(
    creature: Creature,
    onEdit: () => void,
    evt: MouseEvent
) {
    const menu = new Menu();

    menu.addItem((item) => {
        item.setIcon(HP)
            .setTitle("Set Health/Status")
            .onClick((e) => {
                tracker.updateTarget.set("hp");
                tracker.setUpdate(creature, e as MouseEvent);
            });
    });
    if (creature.current_ac != creature.ac) {
        menu.addItem((item) => {
            item.setIcon(HP)
                .setTitle("Reset AC")
                .onClick(() => {
                    creature.current_ac = creature.ac;
                    tracker.updateAndSave();
                });
        });
    }
    menu.addItem((item) => {
        item.setIcon("pencil").setTitle("Edit").onClick(onEdit);
    });
    if (creature.baseColor) {
        menu.addItem((item) => {
            item.setIcon("eraser")
                .setTitle("Clear Mini Base Colour")
                .onClick(() => {
                    tracker.updateCreatures({
                        creature,
                        change: { baseColor: null }
                    });
                });
        });
    }
    if (creature.hidden) {
        menu.addItem((item) => {
            item.setIcon("eye")
                .setTitle("Show")
                .onClick(() => {
                    tracker.updateCreatures({
                        creature,
                        change: { hidden: false }
                    });
                });
        });
    } else {
        menu.addItem((item) => {
            item.setIcon(HIDDEN)
                .setTitle("Hide")
                .onClick(() => {
                    tracker.updateCreatures({
                        creature,
                        change: { hidden: true }
                    });
                });
        });
    }
    if (creature.enabled) {
        menu.addItem((item) => {
            item.setIcon(DISABLE)
                .setTitle("Disable")
                .onClick(() => {
                    tracker.updateCreatures({
                        creature,
                        change: { enabled: false }
                    });
                });
        });
    } else {
        menu.addItem((item) => {
            item.setIcon(ENABLE)
                .setTitle("Enable")
                .onClick(() => {
                    tracker.updateCreatures({
                        creature,
                        change: { enabled: true }
                    });
                });
        });
    }
    menu.addItem((item) => {
        item.setIcon(REMOVE)
            .setTitle("Remove")
            .onClick(() => {
                tracker.remove(creature);
            });
    });

    menu.showAtPosition(evt);
}
