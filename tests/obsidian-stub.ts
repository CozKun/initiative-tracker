// Host adapters only; the beta harness uses the real tracker, creatures, and UI.
export const Platform = { isMacOS: false, isMobile: false };
export const setIcon = (node: HTMLElement, icon: string) => {
    node.dataset.icon = icon;
    const shape = icon === "check" ? '<path d="m5 12 4 4 10-10"/>' : '<path d="m6 6 12 12M6 18 18 6"/>';
    node.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${shape}</svg>`;
};
export const addIcon = () => {};
export function setTooltip(node: HTMLElement, text: string, options?: {classes?: string[]; delay?: number}) {
    node.setAttribute("aria-label", text);
    node.setAttribute("data-tooltip-classes", options?.classes?.join(" ") ?? "");
    node.setAttribute("data-tooltip-delay", String(options?.delay ?? 0));
}
// Model the host's delegated aria-label tooltips, including class styling. The
// production action calls Obsidian; positioning here is only a test-host adapter.
let shownTooltip: HTMLElement | undefined;
let tooltipTimer: ReturnType<typeof setTimeout>;
const hideTooltip = () => { clearTimeout(tooltipTimer); shownTooltip?.remove(); shownTooltip = undefined; };
document.addEventListener("mouseover", (event) => {
    hideTooltip();
    const target = (event.target as Element)?.closest<HTMLElement>("[aria-label]");
    const text = target?.getAttribute("aria-label");
    if (!text) return;
    tooltipTimer = setTimeout(() => {
        shownTooltip = document.createElement("div");
        shownTooltip.className = `tooltip ${target.dataset.tooltipClasses ?? ""}`;
        shownTooltip.setAttribute("role", "tooltip");
        shownTooltip.textContent = text;
        Object.assign(shownTooltip.style, {position:"fixed",zIndex:"9999",pointerEvents:"none",boxSizing:"border-box"});
        document.body.append(shownTooltip);
        const anchor = target.getBoundingClientRect(), bounds = shownTooltip.getBoundingClientRect();
        shownTooltip.style.left = `${Math.max(8,Math.min(anchor.left,innerWidth-bounds.width-8))}px`;
        shownTooltip.style.top = `${Math.max(8,Math.min(anchor.bottom+8,innerHeight-bounds.height-8))}px`;
    }, Number(target.dataset.tooltipDelay) || 0);
});
document.addEventListener("mouseout", hideTooltip);
export class Events { on() {} off() {} trigger() {} }
export class TFile {}
export class MarkdownRenderChild {}
export class Notice { constructor(message: string) { console.info(message); } }
export const parseYaml = () => ({});
export const stringifyYaml = (value: unknown) => JSON.stringify(value, null, 2);
export class Modal {
    containerEl = document.createElement("div");
    titleEl = Object.assign(document.createElement("h2"), { setText(text: string) { this.textContent = text; } });
    contentEl = document.createElement("div");
    constructor(_app: unknown) { this.containerEl.setAttribute("role", "dialog"); this.containerEl.append(this.titleEl, this.contentEl); }
    open() { document.body.append(this.containerEl); }
    close() { this.containerEl.remove(); }
}
export class Setting {
    settingEl: HTMLDivElement;
    constructor(node: HTMLElement) { this.settingEl = document.createElement("div"); node.append(this.settingEl); }
    setName(name: string) { const label = document.createElement("span"); label.textContent = name; this.settingEl.append(label); return this; }
    addText(callback: (text: any) => void) {
        const text = new TextComponent(this.settingEl);
        callback(Object.assign(text, { setPlaceholder(value: string) { text.inputEl.placeholder = value; return this; } })); return this;
    }
    addButton(callback: (button: any) => void) {
        const button = new ExtraButtonComponent(this.settingEl);
        callback(Object.assign(button, { setButtonText(value: string) { button.extraSettingsEl.textContent = value; return this; } })); return this;
    }
}
export class Menu {
    items: any[] = [];
    addItem(callback: (item: any) => void) {
        const item: any = { setIcon() { return this; }, setTitle(title: string) { this.title = title; return this; },
            onClick(action: () => void) { this.action = action; return this; } };
        callback(item); this.items.push(item); return this;
    }
    addSeparator() { return this; }
    showAtMouseEvent() { (window as any).lastMenu = this.items; }
}
export class ExtraButtonComponent {
    extraSettingsEl: HTMLButtonElement;
    constructor(node: HTMLElement) { this.extraSettingsEl = node.ownerDocument.createElement("button"); node.append(this.extraSettingsEl); }
    setIcon(icon: string) { setIcon(this.extraSettingsEl, icon); return this; }
    setTooltip(text: string, options?: {classes?: string[]}) { setTooltip(this.extraSettingsEl, text, options); return this; }
    setDisabled(disabled: boolean) { this.extraSettingsEl.disabled = disabled; return this; }
    onClick(callback: () => void) { this.extraSettingsEl.onclick = callback; return this; }
}
export class TextComponent {
    inputEl: HTMLInputElement;
    constructor(node: HTMLElement) { this.inputEl = node.ownerDocument.createElement("input"); node.append(this.inputEl); }
    onChange(callback: (value: string) => void) { this.inputEl.oninput = () => callback(this.inputEl.value); return this; }
    setValue(value: string) { this.inputEl.value = value; return this; }
}
