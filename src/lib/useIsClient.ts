"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False during the server render and the hydration pass, true afterwards.
 *
 * Anything that branches on a browser capability — `navigator.share`,
 * `document.pictureInPictureEnabled`, a portal target — has to render the
 * server's answer first or hydration mismatches. `useSyncExternalStore` with a
 * separate server snapshot is the supported way to say that, rather than
 * flipping a flag inside an effect and eating a second render.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
