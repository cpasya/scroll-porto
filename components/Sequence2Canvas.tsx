"use client";

import { useEffect, useRef, useCallback } from "react";
// FIX 1: Hapus useScroll, pastikan import useSpring dan MotionValue
import { useSpring, MotionValue } from "framer-motion";
import { useImagePreloaderEncoder } from "@/app/hooks/useImagePreloaderEncoder";

const FRAME_COUNT = 168; // Sesuaikan lagi sama total frame lu

// FIX 2: Tambahin scrollProgress ke dalam interface
interface Sequence2CanvasProps {
    onProgress: (progress: number) => void;
    onLoaded: () => void;
    scrollProgress: MotionValue<number>;
}

// FIX 3: Tangkap scrollProgress di parameter fungsi
export default function Sequence2Canvas({ onProgress, onLoaded, scrollProgress }: Sequence2CanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imagesRef = useRef<HTMLImageElement[]>([]);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const lastFrameRef = useRef<number>(-1);
    const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const rafIdRef = useRef<number | null>(null);

    // FIX 4: Masukin scrollProgress ke dalam useSpring (bukan panggil useScroll() lagi)
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

    // ─── Preload (ini useEffect buat yang lama)───────────────────────────────────────────────────────────────
    // const isMobile = window.innerWidth <= 768;
    // useEffect(() => {
    //     let cancelled = false;
    //     let loadedCount = 0;

    //     const getCurrentIndex = () =>
    //         Math.min(Math.floor(smoothProgress.get() * FRAME_COUNT), FRAME_COUNT - 1);

    //     const onFrameReady = (index: number) => {
    //         if (cancelled) return;
    //         loadedCount++;
    //         onProgress((loadedCount / FRAME_COUNT) * 100);

    //         if (index === 0) {
    //             lastFrameRef.current = -1;
    //             drawFrame(0);
    //         }

    //         if (loadedCount === FRAME_COUNT) {
    //             onLoaded();
    //             lastFrameRef.current = -1;
    //             drawFrame(getCurrentIndex());
    //         }
    //     };

    //     for (let i = 0; i < FRAME_COUNT; i++) {
    //         const img = new Image();
    //         const index = i;

    //         // UPDATE PENTING: Path dirubah ke folder sequence2
    //         img.src = `/sequence4/frame_${index}.webp`;



    //         // Kalau di HP, ambil file dari folder /sequence-mobile (yang resolusinya lebih kecil misal 720x1280)
    //         // Kalau di PC, ambil file dari folder /sequence-desktop (resolusi 1920x1080)
    //         // const folder = isMobile ? 'sequence4_mobile' : 'sequence4_desktop';
    //         // img.src = `/${folder}/frame_${index}.webp`;

    //         img.decode()
    //             .then(() => {
    //                 if (!cancelled) {
    //                     imagesRef.current[index] = img;
    //                     onFrameReady(index);
    //                 }
    //             })
    //             .catch(() => {
    //                 if (!cancelled) {
    //                     imagesRef.current[index] = img;
    //                     onFrameReady(index);
    //                 }
    //             });
    //     }

    //     return () => { cancelled = true; };
    // }, [onLoaded, onProgress, drawFrame, smoothProgress]);

    // ─── Preload menggunakan custom hook ───────────────────────────────────────────
    const onFrameLoaded = useCallback((index: number) => {
        if (index === 0) {
            lastFrameRef.current = -1;
            drawFrame(0);
        }
    }, [drawFrame]);

    const { isLoaded, images } = useImagePreloaderEncoder(
        "/frames/sequence-2",
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
    const SPEED_MULTIPLIER = 1.1333;

    useEffect(() => {
        const unsubscribe = smoothProgress.on("change", (latest) => {
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