/** Keep tracker popovers in the anchor's window, including Obsidian popouts. */
export function popover(node: HTMLElement, options: {
    anchor: HTMLElement;
    close: () => void;
    placement?: "side";
}) {
    const { anchor, close } = options;
    const doc = anchor.ownerDocument;
    const win = doc.defaultView!;
    doc.body.appendChild(node);

    const position = () => {
        if (!anchor.isConnected) return close();
        const bounds = anchor.getBoundingClientRect();
        node.style.maxWidth = `${Math.max(0, win.innerWidth - 16)}px`;
        const table = anchor.closest("table")?.getBoundingClientRect() ?? bounds;
        const sideFits = bounds.right + 8 + node.offsetWidth <= win.innerWidth - 8 || bounds.left - node.offsetWidth - 8 >= 8;
        const belowTable = options.placement === "side" && !sideFits && table.bottom + 100 < win.innerHeight;
        node.style.maxHeight = `${Math.max(0, belowTable ? win.innerHeight - table.bottom - 12 : win.innerHeight - 16)}px`;
        const { width, height } = node.getBoundingClientRect();
        if (options.placement === "side") {
            if (bounds.right + width + 16 <= win.innerWidth || bounds.left - width - 8 >= 8) {
                node.style.left = `${bounds.right + width + 16 <= win.innerWidth ? bounds.right + 8 : bounds.left - width - 8}px`;
                node.style.top = `${Math.max(8, Math.min(bounds.top, win.innerHeight - height - 8))}px`;
                return;
            }
            if (belowTable) {
                node.style.left = `${Math.max(8, Math.min(table.left, win.innerWidth - width - 8))}px`;
                node.style.top = `${table.bottom + 4}px`;
                return;
            }
        }
        node.style.left = `${Math.max(8, Math.min(bounds.left, win.innerWidth - width - 8))}px`;
        node.style.top = `${bounds.bottom + height + 8 <= win.innerHeight
            ? bounds.bottom + 4 : Math.max(8, bounds.top - height - 4)}px`;
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
    doc.addEventListener("scroll", position, true);
    return {
        destroy() {
            observer.disconnect();
            doc.removeEventListener("pointerdown", outside, true);
            doc.removeEventListener("focusin", outside, true);
            doc.removeEventListener("keydown", escape, true);
            win.removeEventListener("resize", position);
            doc.removeEventListener("scroll", position, true);
            node.remove();
        }
    };
}
