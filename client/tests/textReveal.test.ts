import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTextReveal } from "../src/lib/textReveal";

/*
  Animation frames are driven by hand so every test controls time
  exactly. One frame is 16 ms, close to a 60 Hz screen.
*/
let now = 0;
let queued: ((time: number) => void) | null = null;

const runFrames = (count: number) => {
  for (let i = 0; i < count && queued; i++) {
    const callback = queued;
    queued = null;
    now += 16;
    callback(now);
  }
};

const setReducedMotion = (reduce: boolean) => {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes("reduce"),
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
};

describe("createTextReveal", () => {
  beforeEach(() => {
    now = 0;
    queued = null;
    setReducedMotion(false);
    vi.stubGlobal("requestAnimationFrame", (cb: (t: number) => void) => {
      queued = cb;
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {
      queued = null;
    });
    vi.spyOn(performance, "now").mockImplementation(() => now);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("does not show a long answer in one go", () => {
    const shown: string[] = [];
    const reveal = createTextReveal((t) => shown.push(t));
    reveal.push("x".repeat(2000));

    runFrames(1);
    expect(shown.at(-1)!.length).toBeLessThan(2000);
  });

  it("shows the whole answer eventually and then calls finish once", () => {
    let latest = "";
    const done = vi.fn();
    const reveal = createTextReveal((t) => (latest = t));
    const full = "hello world ".repeat(100);

    reveal.push(full);
    reveal.finish(done);
    runFrames(1000);

    expect(latest).toBe(full);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it("calls finish at once when everything is already shown", () => {
    const done = vi.fn();
    const reveal = createTextReveal(() => undefined);
    reveal.finish(done);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it("shows everything immediately for reduced motion", () => {
    setReducedMotion(true);
    let latest = "";
    const reveal = createTextReveal((t) => (latest = t));
    reveal.push("all of it");
    expect(latest).toBe("all of it");
  });

  it("flush shows everything now and skips pacing afterwards", () => {
    let latest = "";
    const reveal = createTextReveal((t) => (latest = t));
    reveal.push("x".repeat(500));
    reveal.flush();
    expect(latest).toHaveLength(500);

    reveal.push("more");
    expect(latest).toHaveLength(504);
  });

  it("does not cut an emoji in half", () => {
    const seen: string[] = [];
    const reveal = createTextReveal((t) => seen.push(t));
    reveal.push("😀".repeat(200));
    runFrames(5);
    for (const t of seen) expect(t).not.toMatch(/[\uD800-\uDBFF]$/);
  });
});
