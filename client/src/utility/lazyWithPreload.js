import { lazy } from "react";

/**
 * React.lazy plus a `preload()` that starts the same dynamic import early.
 *
 * lazy() only requests the chunk when the component first renders -- i.e. after
 * the click. Starting that request on hover or focus instead buys the few
 * hundred milliseconds that make up most of the perceived navigation delay.
 *
 * Calling preload() repeatedly is free: the browser's module registry hands back
 * the same in-flight promise, so a hundred mouseenter events cost one request.
 */
const lazyWithPreload = (factory) => {
  const Component = lazy(factory);
  Component.preload = factory;
  return Component;
};

export default lazyWithPreload;
