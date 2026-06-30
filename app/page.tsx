"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useScroll, useTransform, MotionValue, useMotionValue, useMotionValueEvent, useAnimationControls, useMotionTemplate, Variants } from "framer-motion";
import PortraitCanvas from "@/components/PortraitCanvas";
import Sequence2Canvas from "@/components/Sequence2Canvas";
import SplitText from "@/components/SplitText";
import CurvedLoop from "@/components/CurvedLoop";
import TextPressure from "@/components/TextPressure";
import VelocityText, { VelocityMapping } from "@/components/VelocityText";

// --- 1. KOMPONEN OVERLAY BAKU (KHUSUS UNTUK SECTION 3 / SETERUSNYA) ---
const SectionOverlay = ({
  progress,
  fadeIn = false,
  fadeOut = false,
  fadeInEnd = 0.08,
  fadeOutStart = 0.85,
  fadeOutEnd = 0.95,
}: {
  progress: MotionValue<number>;
  fadeIn?: boolean;
  fadeOut?: boolean;
  fadeInEnd?: number;
  fadeOutStart?: number;
  fadeOutEnd?: number;
}) => {
  const opacity = useTransform(
    progress,
    [0, fadeInEnd, fadeOutStart, fadeOutEnd],
    [fadeIn ? 1 : 0, 0, 0, fadeOut ? 1 : 0]
  );

  return (
    <motion.div
      style={{ opacity }}
      className="absolute inset-0 z-50 bg-[#050505] pointer-events-none"
    />
  );
};

// --- 2. KOMPONEN BEAT TEXT ---
const Beat = ({
  progress,
  start,
  end,
  children,
  align = "center",
  isLast = false,
  zIndex = "z-40",
}: {
  progress: MotionValue<number>;
  start: number;
  end: number;
  children: React.ReactNode;
  align?: "left" | "center" | "right";
  isLast?: boolean;
  zIndex?: string;
}) => {
  const duration = end - start;
  const fadeDuration = Math.min(0.05, duration / 2);

  const fadeEnd = start + fadeDuration;
  const fadeOutStart = isLast ? 1.0 : end - fadeDuration;
  const fadeOutEnd = isLast ? 1.0 : end;
  const yRange = 40;

  const opacity = useTransform(
    progress,
    [start, fadeEnd, fadeOutStart, fadeOutEnd],
    [0, 1, 1, isLast ? 1 : 0]
  );

  const y = useTransform(
    progress,
    [start, fadeEnd, fadeOutStart, fadeOutEnd],
    [yRange, 0, 0, isLast ? 0 : -yRange]
  );

  const alignClass =
    align === "left"
      ? "items-start text-left"
      : align === "right"
        ? "items-end text-right"
        : "items-center text-center";

  return (
    <motion.div
      style={{ opacity, y }}
      className={`absolute inset-0 flex flex-col justify-center px-6 md:px-24 pointer-events-none ${zIndex} ${alignClass}`}
    >
      <div className="max-w-4xl pointer-events-auto">{children}</div>
    </motion.div>
  );
};

// --- Preset animasi Section 2 ---
const sec2Container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
};
const sec2Item: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: "easeOut" } },
};
const sec2Viewport = { once: true, amount: 0.3 };
const splitFrom = { opacity: 0, y: 40 };
const splitTo = { opacity: 1, y: 0 };

// --- 3. PRESET ANIMASI & EFEK (Section 3) ---
const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

const reveal = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE_OUT } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE_OUT } },
};

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const glowAnimate = { opacity: [0.4, 0.7, 0.4], scale: [1, 1.15, 1] };
const glowTransition = { duration: 8, repeat: Infinity, ease: "easeInOut" as const };
const cardHover = { y: -8 };
const viewportOnce = { once: true, amount: 0.2 };
const viewportCards = { once: true, amount: 0.15 };

// --- 5. SCROLL VELOCITY: marquee teks yang kecepatannya ikut scroll ---
interface ScrollVelocityProps {
  scrollContainerRef?: React.RefObject<HTMLElement>;
  texts: React.ReactNode[];
  velocity?: number;
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

const ScrollVelocity = ({
  scrollContainerRef,
  texts = [],
  velocity = 100,
  className = "",
  damping = 50,
  stiffness = 400,
  numCopies = 6,
  velocityMapping = { input: [0, 1000], output: [0, 5] },
  parallaxClassName,
  scrollerClassName,
  parallaxStyle,
  scrollerStyle,
}: ScrollVelocityProps) => {
  return (
    <section>
      {texts.map((text, index) => (
        <VelocityText
          key={index}
          className={className}
          baseVelocity={index % 2 !== 0 ? -velocity : velocity}
          scrollContainerRef={scrollContainerRef}
          damping={damping}
          stiffness={stiffness}
          numCopies={numCopies}
          velocityMapping={velocityMapping}
          parallaxClassName={parallaxClassName}
          scrollerClassName={scrollerClassName}
          parallaxStyle={parallaxStyle}
          scrollerStyle={scrollerStyle}
        >
          {text}
        </VelocityText>
      ))}
    </section>
  );
};

// --- 4. LUXE CARD: kartu glass dengan spotlight ngikutin kursor ---
const LuxeCard = ({
  index,
  title,
  desc,
}: {
  index: string;
  title: string;
  desc: string;
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const spotlight = useMotionTemplate`radial-gradient(280px circle at ${mouseX}px ${mouseY}px, rgba(255,255,255,0.12), transparent 75%)`;
  const cardStyle = { background: spotlight };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      variants={cardVariants}
      whileHover={cardHover}
      className="group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-8 backdrop-blur-sm transition-colors duration-500 hover:border-white/30"
    >
      {/* Spotlight ngikutin kursor */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={cardStyle}
      />
      {/* Garis aksen tipis di atas saat hover */}
      <div className="pointer-events-none absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative z-10">
        <span className="mb-8 block font-mono text-xs tracking-[0.3em] text-white/30">
          {index}
        </span>
        <h3 className="mb-4 text-2xl font-semibold tracking-tight text-white">
          {title}
        </h3>
        <p className="text-sm leading-relaxed text-white/50">{desc}</p>
      </div>
    </motion.div>
  );
};

export default function ScrollytellingPortfolio() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isReturning, setIsReturning] = useState(false);

  // Overlay yang menyamarkan scrubbing webp saat balik ke atas
  const returnOverlay = useAnimationControls();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleBackToTop = async () => {
    if (isReturning) return;
    setIsReturning(true);

    // 1. Tutup layar dengan hitam dulu
    await returnOverlay.start({
      opacity: 1,
      transition: { duration: 0.55, ease: "easeInOut" },
    });

    // 2. Lompat ke atas SECARA INSTAN (tanpa smooth) — scrubbing nggak kelihatan
    window.scrollTo({ top: 0, behavior: "auto" });

    // 3. Beri waktu spring canvas menetap di frame 0 di balik overlay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // 4. Buka tirai perlahan
    await returnOverlay.start({
      opacity: 0,
      transition: { duration: 1, ease: "easeInOut" },
    });

    setIsReturning(false);
  };

  // Ref & Scroll buat Section 1
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Ref & Scroll buat Section 3/4 (Sequence 2)
  const containerRef2 = useRef<HTMLDivElement>(null);
  const { scrollYProgress: scrollYProgress2 } = useScroll({
    target: containerRef2,
    offset: ["start start", "end end"],
  });

  const rawProgress = useMotionValue(0);
  const progressTextRef = useRef<HTMLParagraphElement>(null);

  useMotionValueEvent(rawProgress, "change", (latest) => {
    if (progressTextRef.current) {
      progressTextRef.current.innerText = `LOADING ${Math.min(100, Math.round(latest))}%`;
    }
  });

  const barScaleX = useTransform(rawProgress, [0, 100], [0, 1]);

  const introOpacity = useTransform(scrollYProgress, [0, 0.05, 0.1, 1], [1, 1, 0, 0]);


  return (
    <main className="bg-[#050505] text-black">
      {/* Return-to-top curtain: menutup layar agar scrubbing webp tak terlihat */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={returnOverlay}
        className="fixed inset-0 z-[100] bg-[#050505] flex items-center justify-center"
        style={{ pointerEvents: isReturning ? "auto" : "none" }}
      >
        <motion.span
          animate={{ opacity: isReturning ? [0.2, 1, 0.2] : 0 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="text-white/70 uppercase tracking-[0.5em] text-xs font-bold"
        >
          Bring You Back To Top..
        </motion.span>
      </motion.div>

      {/* Loading Overlay */}
      <motion.div
        animate={{ opacity: isLoaded ? 0 : 1 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        style={{ pointerEvents: isLoaded ? "none" : "auto" }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050505]"
      >
        <div className="w-48 h-px bg-white/20 mb-4 overflow-hidden relative">
          <motion.div
            className="absolute top-0 left-0 h-full bg-white origin-left"
            style={{ scaleX: barScaleX }}
          />
        </div>
        <p
          ref={progressTextRef}
          className="text-white/70 uppercase tracking-[0.2em] text-xs font-bold"
        >
          LOADING 0%
        </p>
      </motion.div>

      {/* SECTION 1: Sequence 1 */}
      <section ref={containerRef} className="relative h-[450vh]">
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          <PortraitCanvas
            onProgress={(p) => rawProgress.set(p)}
            onLoaded={() => setIsLoaded(true)}
            scrollProgress={scrollYProgress}
          />

          <motion.div
            style={{ opacity: introOpacity }}
            className="absolute inset-0 z-40 bg-[#050505] flex flex-col items-center justify-center pointer-events-none"
          >
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", times: [0, 0.5, 1] }}
              className="flex flex-col items-center"
            >
              <span className="text-white/70 uppercase tracking-[0.4em] text-xs font-bold mb-6">
                Scroll to Begin
              </span>
              <div className="w-[1px] h-16 bg-white/20 relative overflow-hidden">
                <motion.div
                  className="absolute top-0 left-0 w-full h-full bg-white/80"
                  animate={{ y: ["-100%", "100%"] }}
                  transition={{ repeat: Infinity, duration: 0.9, ease: "linear", times: [0, 1] }}
                />
              </div>
            </motion.div>
          </motion.div>

          <Beat progress={scrollYProgress} start={0.05} end={0.55}>
            <h1 className="text-7xl md:text-9xl font-bold tracking-tighter mb-4 text-white">
              PASYA.
            </h1>
            <p className="text-xl md:text-2xl font-medium tracking-tight text-white/80">
              Frontend Developer & Creative Technologist.
            </p>
          </Beat>

          <Beat progress={scrollYProgress} start={0.53} end={0.85} align="left">
            <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-4 leading-[0.9] text-white md:text-black">
              PIXEL <br /> PERFECT.
            </h1>
            <p className="text-lg md:text-2xl max-w-xl font-medium leading-relaxed text-white md:text-black">
              Architecting fluid, high-performance web{" "}
              <span
                className="md:text-gray-200"
              >
                experiences
              </span>{" "}
              with Next.js.
            </p>
          </Beat>

          <Beat progress={scrollYProgress} start={0.83} end={1} align="right">
            <h1
              className="text-6xl md:text-8xl font-bold tracking-tight mb-4 leading-[0.9] text-white md:text-black"
            >
              <span className="md:text-[#B3B3B3]">THE</span> VINTAGE <br /> LENS.
            </h1>
            <p className="text-lg md:text-2xl max-w-xl font-medium leading-relaxed ml-auto text-white md:text-black">
              <span
                className="md:text-[#B3B3B3]"
              >
                Blending
              </span>{" "}
              classic aesthetic principles with modern code architecture.
            </p>
          </Beat>


        </div>
      </section>

      {/* SECTION 2: Profile Description */}
      {/* FIX MOBILE: Ganti h-[150vh] jadi min-h-screen py-24 dan tambah overflow-hidden */}
      {/* SECTION 2: Profile Description */}
      <section className="relative min-h-screen bg-gradient-to-b from-[#BABABA] via-[#929292] to-[#060606] text-black flex flex-col justify-center px-6 md:px-24 py-24 z-40 overflow-hidden">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={sec2Viewport}
          variants={sec2Container}
          className="max-w-5xl mx-auto w-full"
        >
          {/* Eyebrow */}
          <motion.div variants={sec2Item} className="mb-10 flex items-center gap-4">
            <span className="h-px w-12 bg-black/40" />
            <span className="font-mono text-xs uppercase tracking-[0.4em] text-black/60">
              001 — About Me
            </span>
          </motion.div>

          {/* Heading */}
          <h2 className="text-5xl md:text-8xl font-bold tracking-tighter text-black leading-[0.95] mb-6 md:mb-8">
            {isMounted ? (
              <SplitText
                text="Beyond The Canvas"
                delay={50}
                duration={1.25}
                ease="power3.out"
                splitType="chars"
                from={splitFrom}
                to={splitTo}
                threshold={0.1}
                rootMargin="-100px"
                textAlign="left"
              />
            ) : (
              "Beyond The Canvas"
            )}
          </h2>

          {/* Sub-heading serif */}
          <motion.p
            variants={sec2Item}
            className="mb-14 md:mb-20 max-w-2xl font-serif text-2xl md:text-4xl italic font-light leading-snug text-black/80"
          >
            Where engineering discipline meets the art of motion.
          </motion.p>

          {/* Body */}
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 text-lg md:text-xl leading-relaxed">
            <motion.p variants={sec2Item} className="text-black/70">
              I&apos;m Pasya ~ a software developer at the Directorate of Airworthiness and
              Aircraft Operation, where every line of code operates in a domain that allows{" "}
              <span className="font-serif italic text-black">zero margin for error</span>.
              Building for aviation taught me that great software isn&apos;t merely written; it&apos;s
              engineered with relentless discipline, precision, and accountability.
            </motion.p>
            <motion.p variants={sec2Item} className="text-black/70">
              That same focus follows me into everything I build. From safeguarding flight
              operations to refining an interface down to the last pixel, I hold an uncompromising
              standard for <span className="font-serif italic text-black">detail and reliability</span> ~
              because whether in the sky or on the screen, the smallest detail is never small.
            </motion.p>
          </div>

          {/* Footer: fokus + divider */}
          {/* <motion.div
            variants={sec2Item}
            className="mt-16 md:mt-24 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-black/15 pt-8"
          >
            <span className="mr-2 font-mono text-xs uppercase tracking-[0.3em] text-white/90">
              Focus
            </span>
            {["Interaction Design", "Motion", "Creative Dev", "Performance"].map((item) => (
              <span
                key={item}
                className="text-sm font-medium uppercase tracking-widest text-white/90 transition-colors duration-300 hover:text-white"
              >
                {item}
              </span>
            ))}
          </motion.div> */}
          <div className="w-screen relative left-1/2 -translate-x-1/2 mt-16 md:mt-24">

            <ScrollVelocity
              texts={["Interaction Design •", "Creative Dev •"]}
              velocity={80}
              numCopies={8}
              damping={50}
              stiffness={400}
              className="text-white/90 drop-shadow-xl"
            />
          </div>
        </motion.div>
      </section>

      {/* SECTION 3: Profile & Capabilities — tema hitam-putih elegan */}
      <section className="relative min-h-screen overflow-hiddent text-white flex flex-col justify-center px-6 md:px-16 py-24 md:py-32 z-40">
        {/* Cahaya radial halus + glow berdenyut biar terkesan mewah */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(255,255,255,0.08),transparent_55%)]" />
        <motion.div
          aria-hidden
          animate={glowAnimate}
          transition={glowTransition}
          className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/[0.04] blur-3xl"
        />

        <div className="relative mx-auto w-full max-w-6xl">
          {/* Eyebrow */}
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            variants={reveal}
            className="mb-10 flex items-center gap-4"
          >
            <span className="h-px w-12 bg-white/40" />
            <span className="font-mono text-xs uppercase tracking-[0.4em] text-white/50">
              002 — Capabilities
            </span>
          </motion.div>

          {/* Heading */}
          <div className="mb-10 md:mb-14">
            {/* Desktop: TextPressure reaktif */}
            <div className="hidden md:block">
              {isMounted ? (
                // <TextPressure
                //   text="Where Precision Meets Artistry"
                //   fontFamily="Compressa VF"
                //   fontUrl="https://res.cloudinary.com/dr6lvwubh/raw/upload/v1529908256/CompressaPRO-GX.woff2"
                //   width={true}
                //   weight={true}
                //   italic={true}
                //   alpha={false}
                //   flex={true}
                //   stroke={false}
                //   scale={true}
                //   textColor="#FFFFFF"
                //   className="text-7xl md:text-8xl"
                //   minFontSize={24}
                // />
                <div className="text-7xl font-bold tracking-tighter text-white">
                  Where Precision Meets Artistry
                </div>
              ) : (
                <div className="text-7xl font-bold tracking-tighter text-white">
                  Where Precision Meets Artistry
                </div>
              )}
            </div>
            {/* Mobile: heading statis dengan aksen serif */}
            <h2 className="block text-5xl font-bold leading-[0.95] tracking-tighter text-white md:hidden">
              Where Precision{" "}
              <span className="font-serif font-normal italic text-white/70">Meets</span> Artistry
            </h2>
          </div>

          {/* Bio profesional */}
          <motion.p
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            variants={reveal}
            className="mb-16 max-w-2xl text-lg leading-relaxed text-white/60 md:mb-20 md:text-xl"
          >
            Frontend engineering, motion, and creative technology converge in everything built
            here. Pairing rigorous, type-safe code with{" "}
            <span className="font-serif italic text-white">cinematic design</span>, every interface
            is crafted to perform flawlessly and linger in memory ~ built to scale, and designed to
            be felt.
          </motion.p>

          {/* Motion cards */}
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={viewportCards}
            variants={staggerContainer}
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            <LuxeCard
              index="01"
              title="Frontend Engineering"
              desc="Building scalable, type-safe interfaces with Next.js and React — optimized for Core Web Vitals and built to last."
            />
            <LuxeCard
              index="02"
              title="Motion & Interaction"
              desc="Choreographing scroll-driven narratives and micro-interactions with Framer Motion and GSAP that feel genuinely alive."
            />
            <LuxeCard
              index="03"
              title="Creative Technology"
              desc="Bridging design and code through WebGL, canvas, and generative visuals to craft award-worthy moments."
            />
            <LuxeCard
              index="04"
              title="Performance & Craft"
              desc="Obsessing over pixel-perfect detail, accessibility, and uncompromising speed across every device."
            />
          </motion.div>

          {/* Tech stack */}
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            variants={reveal}
            className="mt-16 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-white/10 pt-8 md:mt-24"
          >
            {/* <span className="mr-2 font-mono text-xs uppercase tracking-[0.3em] text-white/30">
              Stack
            </span> */}
            {/* {["Next.js 14", "React", "TypeScript", "Framer Motion", "Tailwind CSS", "WebGL"].map(
              (tech) => (
                <span
                  key={tech}
                  className="text-sm font-medium uppercase tracking-widest text-white/40 transition-colors duration-300 hover:text-white"
                >
                  {tech}
                </span>
              )
            )} */}
          </motion.div>
        </div>
      </section>

      {/* TRANSITION TEXT (Border Section 3 & 4) */}
      <div className="relative z-50 w-full h-0 pointer-events-none flex items-center justify-center">
        <div className="absolute w-full flex items-center justify-center -translate-y-5 md:-translate-y-8">
          <CurvedLoop
            marqueeText="Next.js ✦ Framer Motion ✦ Three.js ✦ React ✦ WebGL ✦"
            speed={2}
            curveAmount={200}
            direction="right"
            interactive
            className="custom-text-style"
          />
        </div>
      </div>

      {/* SECTION 4: Sequence 2 */}
      <section ref={containerRef2} className="relative h-[450vh] bg-[#050505]">
        <div className="sticky top-0 h-screen w-full overflow-hidden">

          <Sequence2Canvas
            onProgress={() => { }}
            onLoaded={() => { }}
            scrollProgress={scrollYProgress2}
          />

          <SectionOverlay
            progress={scrollYProgress2}
            fadeIn
            fadeOut
            fadeInEnd={0.02}
            fadeOutStart={0.25}
            fadeOutEnd={0.84}
          />

          <Beat progress={scrollYProgress2} start={0.00} end={0.40} align="left">
            <h2 className="text-6xl md:text-8xl font-bold tracking-tight mb-4 text-white">
              ELEVATING <br /> REALITIES.
            </h2>
            <p className="text-xl md:text-2xl text-white/80">
              Exploring the next dimension of web interactions.
            </p>
          </Beat>

          <Beat progress={scrollYProgress2} start={0.35} end={0.70} align="right">
            <h2 className="text-6xl md:text-8xl font-bold tracking-tight mb-4 text-white">
              SEAMLESS <br /> MOTION.
            </h2>
            <p className="text-xl md:text-2xl text-white/80">
              Where performance meets aesthetics.
            </p>
          </Beat>

          {/* last beat */}
          <Beat progress={scrollYProgress2} start={0.65} end={1} align="center" zIndex="z-[60]" isLast>
            <h2 className="text-6xl md:text-8xl font-bold tracking-tight mb-6 text-white">
              CLEARED FOR TAKEOFF
            </h2>
            <p className="text-lg md:text-xl text-white/70 mb-10">
              Let&apos;s launch something remarkable together.
            </p>
            <div className="flex gap-6 justify-center">
              <a
                href="mailto:pasya0129@gmail.com"
                className="px-8 py-4 bg-white text-black font-semibold tracking-wider uppercase text-sm hover:bg-white/80 transition-colors"
              >
                Email Me
              </a>
              {/* <a
                href="https://github.com/cpasya"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 border border-white/30 text-white font-semibold tracking-wider uppercase text-sm hover:bg-white/10 transition-colors"
              >
                GitHub
              </a> */}
              <a
                href="https://instagram.com/cpasya"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 border border-white/30 text-white font-semibold tracking-wider uppercase text-sm hover:bg-white/10 transition-colors"
              >
                Instagram
              </a>
            </div>
          </Beat>
        </div>
      </section>

      {/* SECTION 5: Thank You / Back to Top */}
      <section className="relative min-h-screen bg-[#050505] flex flex-col items-center justify-center overflow-hidden px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="flex flex-col items-center text-center"
        >
          <span className="text-white/40 uppercase tracking-[0.5em] text-xs font-bold mb-8">
            Thats All.
          </span>
          <h2 className="text-6xl md:text-9xl font-bold tracking-tighter text-white mb-16">
            Thank You.
          </h2>

          <motion.button
            onClick={handleBackToTop}
            initial="rest"
            animate="rest"
            whileHover="hover"
            whileTap={{ scale: 0.95 }}
            className="group flex flex-col items-center gap-5 cursor-pointer"
            aria-label="Back to top"
          >
            <span className="relative flex items-center justify-center w-16 h-16 rounded-full border border-white/30 overflow-hidden transition-colors duration-500 group-hover:border-white">
              <motion.span
                className="absolute inset-0 rounded-full bg-white"
                variants={{ rest: { scale: 0 }, hover: { scale: 1 } }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              />
              <motion.svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="relative z-10 text-white transition-colors duration-300 group-hover:text-black"
                variants={{ rest: { y: 0 }, hover: { y: -4 } }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </motion.svg>
            </span>
            <span className="text-white/60 uppercase tracking-[0.3em] text-xs font-bold transition-colors duration-300 group-hover:text-white">
              Back to Top
            </span>
          </motion.button>
        </motion.div>
      </section>

    </main>
  );
}