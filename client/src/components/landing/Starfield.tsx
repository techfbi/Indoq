"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  phase: number;
}

const STAR_DENSITY = 1 / 9000;

/*
  Slowly drifting, twinkling stars drawn on one canvas behind the
  page. With reduced motion the stars are drawn once and stay still.
  Drawing stops while the tab is hidden to save battery.
*/
const Starfield = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let stars: Star[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const count = Math.round(width * height * STAR_DENSITY);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() < 0.15 ? 1.6 + Math.random() : 0.4 + Math.random() * 0.8,
        speed: 2 + Math.random() * 6,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      for (const star of stars) {
        const twinkle = still ? 0.7 : 0.45 + 0.55 * Math.abs(Math.sin(time / 1400 + star.phase));
        context.globalAlpha = twinkle;
        context.fillStyle = "#e9dcff";
        context.beginPath();
        context.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        context.fill();
      }
    };

    let last = performance.now();
    const tick = (time: number) => {
      const seconds = Math.min((time - last) / 1000, 0.1);
      last = time;
      for (const star of stars) {
        star.y -= star.speed * seconds;
        if (star.y < -4) {
          star.y = height + 4;
          star.x = Math.random() * width;
        }
      }
      draw(time);
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      cancelAnimationFrame(frame);
      if (still) {
        draw(0);
        return;
      }
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };

    const handleVisibility = () => {
      if (document.hidden) cancelAnimationFrame(frame);
      else start();
    };

    const observer = new ResizeObserver(() => {
      resize();
      if (still) draw(0);
    });

    resize();
    start();
    observer.observe(canvas);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 h-full w-full"
    />
  );
};

export default Starfield;
