// Host adapters only; the beta harness uses the real tracker, creatures, and UI.
export const Platform = { isMacOS: false, isMobile: false };
export const setIcon = (node: HTMLElement, icon: string) => {
    node.dataset.icon = icon;
    const shape = icon === "check" ? '<path d="m5 12 4 4 10-10"/>' : '<path d="m6 6 12 12M6 18 18 6"/>';
    node.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${shape}</svg>`;
};
export const addIcon = () => {};
export class Events { on() {} off() {} trigger() {} }
export class TFile {}
export class MarkdownRenderChild {}
export class Notice { constructor(message: string) { console.info(message); } }
export const parseYaml = () => ({});
export class Setting {}
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
    setTooltip(text: string) { this.extraSettingsEl.title = text; return this; }
    setDisabled(disabled: boolean) { this.extraSettingsEl.disabled = disabled; return this; }
    onClick(callback: () => void) { this.extraSettingsEl.onclick = callback; return this; }
}
export class TextComponent {
    inputEl: HTMLInputElement;
    constructor(node: HTMLElement) { this.inputEl = node.ownerDocument.createElement("input"); node.append(this.inputEl); }
    onChange(callback: (value: string) => void) { this.inputEl.oninput = () => callback(this.inputEl.value); return this; }
    setValue(value: string) { this.inputEl.value = value; return this; }
}
