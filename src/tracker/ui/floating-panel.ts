/** Non-modal panel: remains open while the user opens statblocks elsewhere. */
export function floatingPanel(node: HTMLElement) {
    const doc = node.ownerDocument;
    const win = doc.defaultView!;
    const previousFocus = doc.activeElement as HTMLElement;
    doc.body.appendChild(node);
    let left: number, top = 64;
    const constrain = () => {
        node.style.maxWidth = `${Math.max(0, win.innerWidth - 16)}px`;
        node.style.maxHeight = `${Math.max(0, win.innerHeight - 16)}px`;
        left = Math.max(8, Math.min(left ?? win.innerWidth - node.offsetWidth - 16, win.innerWidth - node.offsetWidth - 8));
        top = Math.max(8, Math.min(top, win.innerHeight - node.offsetHeight - 8));
        node.style.left = `${left}px`; node.style.top = `${top}px`;
    };
    let drag: { x: number; y: number } | null = null;
    const down = (e: PointerEvent) => {
        if (e.button !== 0 || !(e.target as HTMLElement).closest('.panel-drag')) return;
        e.preventDefault(); drag = { x: e.clientX - left, y: e.clientY - top };
    };
    const move = (e: PointerEvent) => {
        if (!drag) return;
        left = e.clientX - drag.x; top = e.clientY - drag.y; constrain();
    };
    const up = () => { drag = null; };
    const key = (e: KeyboardEvent) => {
        if (!(e.target as HTMLElement).closest('.panel-drag') || !e.key.startsWith('Arrow')) return;
        e.preventDefault();
        left += e.key === 'ArrowLeft' ? -20 : e.key === 'ArrowRight' ? 20 : 0;
        top += e.key === 'ArrowUp' ? -20 : e.key === 'ArrowDown' ? 20 : 0;
        constrain();
    };
    constrain();
    const observer = new win.ResizeObserver(constrain); observer.observe(node);
    node.addEventListener('pointerdown', down); node.addEventListener('keydown', key);
    doc.addEventListener('pointermove', move); doc.addEventListener('pointerup', up); doc.addEventListener('pointercancel', up);
    win.addEventListener('resize', constrain);
    return { destroy() {
        observer.disconnect(); node.removeEventListener('pointerdown', down); node.removeEventListener('keydown', key);
        doc.removeEventListener('pointermove', move); doc.removeEventListener('pointerup', up); doc.removeEventListener('pointercancel', up);
        win.removeEventListener('resize', constrain);
        if (node.contains(doc.activeElement) && previousFocus?.isConnected) previousFocus.focus();
        node.remove();
    } };
}
