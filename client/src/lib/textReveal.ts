/*
  Reveals streamed text at a steady, readable pace. The model often
  sends a whole answer in well under a second, and network chunks come
  in bursts, so showing tokens the moment they arrive looks instant or
  jerky. Never falls far behind, the pace rises with the backlog.
*/
const MIN_CHARS_PER_SECOND = 140;
const CATCH_UP_SECONDS = 2;

// A long gap between frames must not dump a large jump of text
const MAX_FRAME_SECONDS = 0.1;

export interface TextReveal {
  push: (text: string) => void;
  finish: (onShown: () => void) => void;
  flush: () => void;
}

const prefersInstant = () =>
  document.hidden ||
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Avoids cutting an emoji in half
const safeEnd = (text: string, end: number): number => {
  const code = text.charCodeAt(end - 1);
  return code >= 0xd800 && code <= 0xdbff ? end + 1 : end;
};

export const createTextReveal = (
  onText: (text: string) => void
): TextReveal => {
  let target = "";
  let shown = 0;
  let frame = 0;
  let lastTime = 0;
  let instant = false;
  let onShown: (() => void) | null = null;

  const settle = () => {
    document.removeEventListener("visibilitychange", handleVisibility);
    const callback = onShown;
    onShown = null;
    callback?.();
  };

  const showAll = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    shown = target.length;
    onText(target);
    if (onShown) settle();
  };

  // Animation frames pause in a hidden tab, so catch up before they do
  const handleVisibility = () => {
    if (document.hidden) showAll();
  };

  const tick = (time: number) => {
    // A frame can be stamped earlier than the moment it was requested
    const elapsed = Math.min(
      Math.max(0, (time - lastTime) / 1000),
      MAX_FRAME_SECONDS
    );
    lastTime = time;

    const backlog = target.length - shown;
    const speed = Math.max(MIN_CHARS_PER_SECOND, backlog / CATCH_UP_SECONDS);
    shown = Math.min(target.length, shown + speed * elapsed);
    onText(target.slice(0, safeEnd(target, Math.floor(shown))));

    if (shown < target.length) {
      frame = requestAnimationFrame(tick);
      return;
    }
    frame = 0;
    if (onShown) settle();
  };

  const start = () => {
    if (instant || prefersInstant()) {
      showAll();
      return;
    }
    if (frame !== 0) return;
    lastTime = performance.now();
    frame = requestAnimationFrame(tick);
  };

  document.addEventListener("visibilitychange", handleVisibility);

  return {
    push: (text) => {
      target += text;
      start();
    },
    // Runs the callback once everything received is on screen
    finish: (callback) => {
      onShown = callback;
      if (shown >= target.length) settle();
      else start();
    },
    // Shows everything now, and from here on skips the pacing
    flush: () => {
      instant = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      showAll();
    },
  };
};
