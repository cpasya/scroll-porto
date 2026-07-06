"use client";

import { useEffect, useRef, useCallback } from "react";
// FIX: Hapus useScroll dari import, tambahkan MotionValue
import { useSpring, MotionValue } from "framer-motion";
import { useImagePreloaderEncoder } from "@/app/hooks/useImagePreloaderEncoder";

//frame-1
const FRAME_COUNT = 118;

//frame5
// const FRAME_COUNT = 194;

interface PortraitCanvasProps {
  onProgress: (progress: number) => void;
  onLoaded: () => void;
  // FIX: Tambahin props baru untuk nerima scroll dari page.tsx
  scrollProgress: MotionValue<number>;
}

export default function PortraitCanvas({ onProgress, onLoaded, scrollProgress }: PortraitCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const lastFrameRef = useRef<number>(-1);
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // FIX: Kita pake scrollProgress dari props, bukan dari global useScroll()
  const smoothProgress = useSpring(scrollProgress, {
    stiffness: 300,
    damping: 30,
    restDelta: 0.001,
  });

  // ─── Draw ──────────────────────────────────────────────────────────────────
  const drawFrame = useCallback((frameIndex: number) => {
    if (frameIndex === lastFrameRef.current) return;
    lastFrameRef.current = frameIndex;

    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    const img = imagesRef.current[frameIndex];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const cw = canvas.width;
    const ch = canvas.height;

    ctx.fillStyle = "#8A8A8A";
    ctx.fillRect(0, 0, cw, ch);

    const canvasRatio = cw / ch;
    const imgRatio = img.naturalWidth / img.naturalHeight;

    let drawWidth = cw;
    let drawHeight = ch;
    let offsetX = 0;
    let offsetY = 0;

    if (canvasRatio > imgRatio) {
      drawHeight = cw / imgRatio;
      offsetY = (ch - drawHeight) / 2;
    } else {
      drawWidth = ch * imgRatio;
      offsetX = (cw - drawWidth) / 2;
    }

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  }, []);

  // ─── Context + canvas size ─────────────────────────────────────────────────
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctxRef.current = ctx;

    lastFrameRef.current = -1;
    const index = Math.min(
      Math.floor(smoothProgress.get() * FRAME_COUNT),
      FRAME_COUNT - 1,
    );
    drawFrame(index);
  }, [smoothProgress, drawFrame]);

  // ─── Preload menggunakan custom hook ───────────────────────────────────────────
  const onFrameLoaded = useCallback((index: number) => {
    if (index === 0) {
      lastFrameRef.current = -1;
      drawFrame(0);
    }
  }, [drawFrame]);

  const { isLoaded, images } = useImagePreloaderEncoder(
    "/frames/sequence-1",
    FRAME_COUNT,
    onProgress,
    onFrameLoaded
  );

  useEffect(() => {
    imagesRef.current = images;

    if (isLoaded) {
      onLoaded();
      lastFrameRef.current = -1;
      const index = Math.min(
        Math.floor(smoothProgress.get() * FRAME_COUNT),
        FRAME_COUNT - 1,
      );
      drawFrame(index);
    }
  }, [isLoaded, images, onLoaded, drawFrame, smoothProgress]);

  // ─── Initial canvas setup ──────────────────────────────────────────────────
  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  // ─── Resize with debounce ──────────────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => {
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = setTimeout(initCanvas, 137);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
    };
  }, [initCanvas]);

  // ─── Scroll sync ───────────────────────────────────────────────────────────
  // FIX: Ubah SPEED_MULTIPLIER jadi 1 biar framenya habis berbarengan sama sisa scroll
  const SPEED_MULTIPLIER = 1.05;

  useEffect(() => {
    const unsubscribe = smoothProgress.on("change", (latest) => {
      // FIX: Canvas cuma akan nge-render jika valuenya berubah, 
      // dan karena diikat ke section masing-masing, dia otomatis diem (idle) kalau lagi nggak di-scroll.
      const clamped = Math.min(latest * SPEED_MULTIPLIER, 1);
      const index = Math.min(Math.floor(clamped * FRAME_COUNT), FRAME_COUNT - 1);

      const img = imagesRef.current[index];
      if (!img || !img.complete || img.naturalWidth === 0) return;

      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }

      rafIdRef.current = requestAnimationFrame(() => {
        drawFrame(index);
      });
    });

    return () => {
      unsubscribe();
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [smoothProgress, drawFrame]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ display: "block" }}
    />
  );
}