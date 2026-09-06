import { setTooltip, type TooltipOptions } from "obsidian";
import { getId } from "src/utils/creature";

export const tooltipOptions: TooltipOptions = {
    classes: ["coz-initiative-tooltip"],
    delay: 350
};

type TooltipContent = string | { text: string; label?: string };

/** Use Obsidian's tooltip engine while keeping short, meaningful accessible names. */
export function tooltip(node: HTMLElement, content: TooltipContent) {
    const originalLabel = node.getAttribute("aria-label");
    const originalLabelledBy = node.getAttribute("aria-labelledby");
    const originalDescription = node.getAttribute("aria-description");
    let accessibleLabel: HTMLSpanElement | undefined;
    const update = (value: TooltipContent) => {
        const text = typeof value === "string" ? value : value.text;
        const label = (typeof value === "string" ? undefined : value.label) ?? originalLabel ??
            (node.matches("button, summary, a, th") ? node.textContent?.trim() : undefined);
        setTooltip(node, text, tooltipOptions);
        node.setAttribute("aria-description", text);
        // Obsidian uses aria-label for hover text. aria-labelledby takes precedence
        // for assistive technology, so the action name needn't become a paragraph.
        if (label && !originalLabelledBy) {
            if (!accessibleLabel) {
                accessibleLabel = node.ownerDocument.createElement("span");
                accessibleLabel.id = `initiative-tooltip-${getId()}`;
                accessibleLabel.hidden = true;
                node.ownerDocument.body.append(accessibleLabel);
            }
            accessibleLabel.textContent = label;
            node.setAttribute("aria-labelledby", accessibleLabel.id);
        }
    };
    update(content);
    return { update, destroy() {
        accessibleLabel?.remove();
        setTooltip(node, "");
        for (const [name, value] of [["aria-label", originalLabel], ["aria-labelledby", originalLabelledBy],
            ["aria-description", originalDescription]]) {
            if (value === null) node.removeAttribute(name);
            else node.setAttribute(name, value);
        }
    } };
}
