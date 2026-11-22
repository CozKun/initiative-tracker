import { prefersTouchInput, visibleViewport } from "./viewport";
/** Non-modal panel: remains open while the user opens statblocks elsewhere. */
export function floatingPanel(node: HTMLElement, { centred = false } = {}) {
    const doc = node.ownerDocument;
    const win = doc.defaultView!;
    const previousFocus = doc.activeElement as HTMLElement;
    doc.body.appendChild(node);
    let left: number, top = 64;
    let viewportEvents: VisualViewport | null = null;
    let frame = 0;
    const constrain = () => {
        const viewport = visibleViewport(win);
        node.style.maxWidth = `${Math.max(0, viewport.width - 16)}px`;
        node.style.maxHeight = `${Math.max(0, viewport.height - 16)}px`;
        if (prefersTouchInput(win) || centred) {
            left = viewport.left + Math.max(8, (viewport.width - node.offsetWidth) / 2);
            const space = Math.max(8, (viewport.height - node.offsetHeight) / 2);
            top = viewport.top + (prefersTouchInput(win) ? Math.min(48, space) : space);
        } else {
            left = Math.max(viewport.left + 8, Math.min(left ?? viewport.right - node.offsetWidth - 16, viewport.right - node.offsetWidth - 8));
            top = Math.max(viewport.top + 8, Math.min(top, viewport.bottom - node.offsetHeight - 8));
        }
        node.style.left = `${left}px`; node.style.top = `${top}px`;
        const focused = doc.activeElement as HTMLElement;
        if (node.contains(focused) && focused.matches('input,select,textarea')) {
            const scroll = focused.closest<HTMLElement>(".panel-scroll");
            const bounds = scroll?.getBoundingClientRect();
            if (bounds) {
                const field = focused.getBoundingClientRect();
                if (field.bottom > bounds.bottom - 4) scroll.scrollTop += field.bottom - bounds.bottom + 4;
                else if (field.top < bounds.top + 4) scroll.scrollTop -= bounds.top - field.top + 4;
            }
        }
    };
    const schedule = () => {
        if (frame) return;
        frame = win.requestAnimationFrame(() => { frame = 0; constrain(); });
    };
    const connectViewport = () => {
        if (viewportEvents !== win.visualViewport) {
            viewportEvents?.removeEventListener("resize", schedule);
            viewportEvents?.removeEventListener("scroll", schedule);
            viewportEvents = win.visualViewport;
            viewportEvents?.addEventListener("resize", schedule);
            viewportEvents?.addEventListener("scroll", schedule);
        }
        schedule();
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
    const observer = new win.ResizeObserver(schedule); observer.observe(node);
    node.addEventListener('pointerdown', down); node.addEventListener('keydown', key);
    doc.addEventListener('pointermove', move); doc.addEventListener('pointerup', up); doc.addEventListener('pointercancel', up);
    node.addEventListener('focusin', schedule);
    win.addEventListener('resize', connectViewport);
    connectViewport();
    return { destroy() {
        observer.disconnect(); node.removeEventListener('pointerdown', down); node.removeEventListener('keydown', key);
        doc.removeEventListener('pointermove', move); doc.removeEventListener('pointerup', up); doc.removeEventListener('pointercancel', up);
        win.removeEventListener('resize', connectViewport);
        node.removeEventListener('focusin', schedule);
        viewportEvents?.removeEventListener('resize', schedule);
        viewportEvents?.removeEventListener('scroll', schedule);
        win.cancelAnimationFrame(frame);
        if (node.contains(doc.activeElement) && previousFocus?.isConnected) previousFocus.focus();
        node.remove();
    } };
}
