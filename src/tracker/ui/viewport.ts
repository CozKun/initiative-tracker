import { Platform } from "obsidian";

/** Visible layout coordinates, including the area left above a software keyboard. */
export function visibleViewport(win: Window) {
    const viewport = win.visualViewport;
    const left = viewport?.offsetLeft ?? 0, top = viewport?.offsetTop ?? 0;
    const width = viewport?.width ?? win.innerWidth, height = viewport?.height ?? win.innerHeight;
    return {left, top, width, height, right:left+width, bottom:top+height};
}

export function prefersTouchInput(win: Window) {
    return Platform.isMobile || win.matchMedia("(pointer: coarse)").matches;
}
