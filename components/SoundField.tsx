"use client";

import { useEffect, useRef } from "react";

/**
 * Flowing soundwave field on <canvas>. Travels across the screen, reacts subtly to cursor
 * (amplitude + parallax). Pauses when offscreen. Disabled on reduced-motion and touch-only devices
 * falls back to a static frame.
 */
export function SoundField({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(pointer: fine)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let running = true;
    let t = 0;
    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.tx = (e.clientX - rect.left) / rect.width;
      mouse.ty = (e.clientY - rect.top) / rect.height;
    };

    const draw = () => {
      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;
      ctx.clearRect(0, 0, width, height);

      const waves = [
        { amp: 26, freq: 0.0075, speed: 0.55, y: 0.52, colors: ["#8b5cf6", "#ec4899", "#22d3ee"], alpha: 0.75, lw: 1.6 },
        { amp: 18, freq: 0.011, speed: 0.38, y: 0.58, colors: ["#22d3ee", "#8b5cf6"], alpha: 0.5, lw: 1.2 },
        { amp: 40, freq: 0.0045, speed: 0.25, y: 0.47, colors: ["#ec4899", "#3b82f6"], alpha: 0.3, lw: 1 },
        { amp: 12, freq: 0.016, speed: 0.8, y: 0.62, colors: ["#e8c069", "#22d3ee"], alpha: 0.35, lw: 0.9 },
      ];

      const reactive = 0.7 + (1 - mouse.y) * 0.8; // cursor higher -> bigger waves
      const parallax = (mouse.x - 0.5) * 30;

      for (const w of waves) {
        const grad = ctx.createLinearGradient(0, 0, width, 0);
        w.colors.forEach((c, i) => grad.addColorStop(i / (w.colors.length - 1), c));
        ctx.strokeStyle = grad;
        ctx.globalAlpha = w.alpha;
        ctx.lineWidth = w.lw;
        ctx.beginPath();
        const base = height * w.y + parallax * (w.y - 0.5) * 2;
        for (let x = 0; x <= width; x += 3) {
          const envelope = Math.sin((x / width) * Math.PI); // fade at edges
          const y =
            base +
            Math.sin(x * w.freq + t * w.speed) * w.amp * reactive * envelope +
            Math.sin(x * w.freq * 2.3 - t * w.speed * 1.4) * (w.amp * 0.35) * envelope;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // frequency particles: soft glowing dots riding the primary wave
      ctx.globalAlpha = 1;
      for (let i = 0; i < 22; i += 1) {
        const px = ((i / 22) * width + t * 22) % width;
        const envelope = Math.sin((px / width) * Math.PI);
        const py = height * 0.52 + Math.sin(px * 0.0075 + t * 0.55) * 26 * reactive * envelope;
        const r = 1.2 + Math.sin(t * 2 + i) * 0.6;
        const g = ctx.createRadialGradient(px, py, 0, px, py, r * 6);
        g.addColorStop(0, "rgba(34,211,238,0.6)");
        g.addColorStop(1, "rgba(34,211,238,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, r * 6, 0, Math.PI * 2);
        ctx.fill();
      }

      t += 0.016;
      if (running && !reduce) raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    if (fine) window.addEventListener("mousemove", onMove, { passive: true });

    const io = new IntersectionObserver((entries) => {
      const visible = entries.some((e) => e.isIntersecting);
      if (visible && !running) {
        running = true;
        if (!reduce) raf = requestAnimationFrame(draw);
      } else if (!visible) {
        running = false;
        cancelAnimationFrame(raf);
      }
    });
    io.observe(canvas);
    draw();

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} />;
}
