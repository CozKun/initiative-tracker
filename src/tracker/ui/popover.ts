import { visibleViewport } from "./viewport";
/** Keep tracker popovers in the anchor's window, including Obsidian popouts. */
export function popover(node: HTMLElement, options: {
    anchor: HTMLElement;
    close: () => void;
    placement?: "side" | "top";
}) {
    const { anchor, close } = options;
    const doc = anchor.ownerDocument;
    const win = doc.defaultView!;
    const host = node.closest(".modal-container") ?? doc.body;
    host.appendChild(node);

    const position = () => {
        if (!anchor.isConnected) return close();
        const viewport = visibleViewport(win);
        const bounds = anchor.getBoundingClientRect();
        node.style.maxWidth = `${Math.max(0, viewport.width - 16)}px`;
        node.style.maxHeight = `${Math.max(0, viewport.height - 16)}px`;
        const table = anchor.closest("table")?.getBoundingClientRect() ?? bounds;
        const { width, height } = node.getBoundingClientRect();
        if (options.placement === "top") {
            node.style.left = `${viewport.left + Math.max(8, (viewport.width - width) / 2)}px`;
            node.style.top = `${viewport.top + Math.max(8, Math.min(48, (viewport.height - height) / 2))}px`;
            return;
        }
        if (options.placement === "side") {
            if (bounds.right + width + 16 <= viewport.right || bounds.left - width - 8 >= viewport.left + 8) {
                node.style.left = `${bounds.right + width + 16 <= viewport.right ? bounds.right + 8 : bounds.left - width - 8}px`;
                node.style.top = `${Math.max(viewport.top + 8, Math.min(bounds.top, viewport.bottom - height - 8))}px`;
                return;
            }
            if (table.bottom >= viewport.top + 4 && table.bottom + height + 12 <= viewport.bottom) {
                node.style.left = `${Math.max(viewport.left + 8, Math.min(table.left, viewport.right - width - 8))}px`;
                node.style.top = `${table.bottom + 4}px`;
                return;
            }
        }
        node.style.left = `${Math.max(viewport.left + 8, Math.min(bounds.left, viewport.right - width - 8))}px`;
        node.style.top = `${bounds.bottom + height + 12 <= viewport.bottom
            ? Math.max(viewport.top + 8, bounds.bottom + 4) : Math.max(viewport.top + 8, Math.min(bounds.top - height - 4, viewport.bottom - height - 8))}px`;
    };
    const outside = (event: Event) => {
        const target = event.target as Node;
        if (!node.contains(target) && !anchor.contains(target)) close();
    };
    const escape = (event: KeyboardEvent) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        close();
        anchor.focus();
    };
    position();
    const observer = new win.ResizeObserver(position);
    observer.observe(node);
    doc.addEventListener("pointerdown", outside, true);
    doc.addEventListener("focusin", outside, true);
    doc.addEventListener("keydown", escape, true);
    win.addEventListener("resize", position);
    win.visualViewport?.addEventListener("resize", position);
    win.visualViewport?.addEventListener("scroll", position);
    doc.addEventListener("scroll", position, true);
    return {
        destroy() {
            observer.disconnect();
            doc.removeEventListener("pointerdown", outside, true);
            doc.removeEventListener("focusin", outside, true);
            doc.removeEventListener("keydown", escape, true);
            win.removeEventListener("resize", position);
            win.visualViewport?.removeEventListener("resize", position);
            win.visualViewport?.removeEventListener("scroll", position);
            doc.removeEventListener("scroll", position, true);
            node.remove();
        }
    };
}
