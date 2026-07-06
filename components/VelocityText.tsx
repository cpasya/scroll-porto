'use client';

import React, { useRef, useLayoutEffect, useState } from 'react';
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useMotionValue,
  useMotionTemplate,
  useVelocity,
  useAnimationFrame,
} from 'framer-motion';

export interface VelocityMapping {
  input: [number, number];
  output: [number, number];
}

export interface VelocityTextProps {
  children: React.ReactNode;
  baseVelocity: number;
  scrollContainerRef?: React.RefObject<HTMLElement>;
  className?: string;
  damping?: number;
  stiffness?: number;
  numCopies?: number;
  velocityMapping?: VelocityMapping;
  parallaxClassName?: string;
  scrollerClassName?: string;
  parallaxStyle?: React.CSSProperties;
  scrollerStyle?: React.CSSProperties;
}

// PERF FIX #3: pakai ResizeObserver, bukan event "resize" window.
// Di HP, scroll bikin address bar muncul/sembunyi -> event resize kepicu terus
// (padahal LEBAR nggak berubah) -> re-render nggak perlu -> lag.
// ResizeObserver cuma jalan kalau lebar elemen beneran berubah.
function useElementWidth<T extends HTMLElement>(
  ref: React.RefObject<T | null>
): number {
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      // cuma update state kalau nilainya beneran beda
      setWidth((prev) => (el.offsetWidth !== prev ? el.offsetWidth : prev));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}

function wrap(min: number, max: number, v: number): number {
  const range = max - min;
  const mod = (((v - min) % range) + range) % range;
  return mod + min;
}

export const VelocityText: React.FC<VelocityTextProps> = ({
  children,
  baseVelocity = 100,
  scrollContainerRef,
  className = '',
  damping,
  stiffness,
  numCopies,
  velocityMapping,
  parallaxClassName,
  scrollerClassName,
  parallaxStyle,
  scrollerStyle,
}) => {
  const baseX = useMotionValue(0);
  const scrollOptions = scrollContainerRef
    ? { container: scrollContainerRef }
    : {};
  const { scrollY } = useScroll(scrollOptions);
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: damping ?? 50,
    stiffness: stiffness ?? 400,
    restDelta: 0.001, // biar spring "settle" & berhenti hitung saat diam
  });
  const velocityFactor = useTransform(
    smoothVelocity,
    velocityMapping?.input || [0, 1000],
    velocityMapping?.output || [0, 5],
    { clamp: false }
  );

  const copyRef = useRef<HTMLSpanElement>(null);
  const copyWidth = useElementWidth(copyRef);

  // PERF FIX #2: transform ngeluarin ANGKA murni (bukan string "...px").
  const x = useTransform(baseX, (v) => {
    if (copyWidth === 0) return 0;
    return wrap(-copyWidth, 0, v);
  });

  // Bungkus jadi translate3d -> maksa browser bikin GPU compositing layer,
  // jadi animasinya di-handle GPU (jauh lebih mulus di HP).
  const transform = useMotionTemplate`translate3d(${x}px, 0, 0)`;

  const directionFactor = useRef<number>(1);
  useAnimationFrame((t, delta) => {
    let moveBy = directionFactor.current * baseVelocity * (delta / 1000);

    const factor = velocityFactor.get(); // panggil sekali, bukan 3x
    if (factor < 0) {
      directionFactor.current = -1;
    } else if (factor > 0) {
      directionFactor.current = 1;
    }

    moveBy += directionFactor.current * moveBy * factor;
    baseX.set(baseX.get() + moveBy);
  });

  const spans = [];
  for (let i = 0; i < (numCopies ?? 6); i++) {
    spans.push(
      <span
        className={`flex-shrink-0 ${className}`}
        key={i}
        ref={i === 0 ? copyRef : null}
      >
        {children}&nbsp;
      </span>
    );
  }

  return (
    <div
      className={`${parallaxClassName} relative overflow-hidden`}
      style={parallaxStyle}
    >
      <motion.div
        // PERF FIX #1: "drop-shadow" DIHAPUS — filter ini paling bikin berat
        // buat teks besar yang gerak tiap frame di HP.
        className={`${scrollerClassName} flex whitespace-nowrap text-center font-sans text-4xl font-bold tracking-[-0.02em] md:text-[5rem] md:leading-[5rem]`}
        style={{
          transform,
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          ...scrollerStyle,
        }}>
        {spans}
      </motion.div>
    </div>
  );
};

export default VelocityText;