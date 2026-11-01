"use client"

import { useEffect, useRef } from "react"
import { isMenuOpen, setHeroLocked } from "@/lib/scroll-state"

// ─────────────────────────────────────────────────────────────
// Locked scroll-scrub video hero, from 21st.dev (MetroHero).
// While locked the body is pinned with position:fixed and wheel/
// touch/keyboard input drives video.currentTime instead. Reaching
// the end and pushing on a little further releases the page;
// scrolling back up at the very top re-locks it and scrubs back.
// ─────────────────────────────────────────────────────────────

export interface MetroHeroProps {
  videoSrc: string
  poster?: string
  title?: string
  scrollHint?: string
  tagline?: string
  /** Total input distance (px) needed to scrub the full video. Tune to taste. */
  scrubDistance?: number
  className?: string
  style?: React.CSSProperties
}

const COL_BG = "#05070d"
const COL_TEXT = "#f2f4f8"

// Light grade towards neon cartoon. CSS only: an SVG filter here janks on phones.
const VIDEO_GRADE = "saturate(1.28) contrast(1.07) hue-rotate(-8deg)"

// How far to keep pushing past the last frame before the page lets go.
const RELEASE_PUSH_DESKTOP = 300
const RELEASE_PUSH_PHONE = 110
const PHONE_DISTANCE_SCALE = 0.45

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

export default function MetroHero({
  videoSrc,
  poster,
  title = "THE CITY OPENS",
  scrollHint = "SCROLL",
  tagline = "Every door in the city is already open.",
  scrubDistance = 2600,
  className,
  style,
}: MetroHeroProps) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const hintRef = useRef<HTMLDivElement>(null)
  const taglineRef = useRef<HTMLDivElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const video = videoRef.current
    const section = sectionRef.current
    if (!video || !section) return

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const isPhone = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches
    const distance = isPhone ? scrubDistance * PHONE_DISTANCE_SCALE : scrubDistance
    const releasePush = isPhone ? RELEASE_PUSH_PHONE : RELEASE_PUSH_DESKTOP

    let duration = 0
    let rafId = 0
    let targetProgress = 0
    let currentProgress = 0
    let renderedProgress = -1
    let overshoot = 0
    let isSeeking = false
    let pendingTime: number | null = null
    let locked = false
    let lockedScrollY = 0
    let touchStartY = 0

    const onLoadedData = () => {
      duration = video.duration || 0
      if (reduceMotion) {
        video.currentTime = duration * 0.92
      }
    }
    video.addEventListener("loadeddata", onLoadedData)
    if (video.readyState >= 2) onLoadedData()

    // iOS Safari often won't buffer any video data — even with
    // preload="auto" — until playback actually starts, to save mobile
    // data. Since we only ever seek (never call play() elsewhere), the
    // video can stay permanently blank on iPhone. Force a silent
    // play-then-immediately-pause on mount to kick off real loading.
    const kickstartLoad = () => {
      const p = video.play()
      if (p && typeof p.then === "function") {
        p.then(() => video.pause()).catch(() => {})
      } else {
        video.pause()
      }
    }
    kickstartLoad()

    const onSeeked = () => {
      isSeeking = false
      if (pendingTime !== null) {
        const t = pendingTime
        pendingTime = null
        isSeeking = true
        video.currentTime = t
      }
    }
    video.addEventListener("seeked", onSeeked)

    function seekTo(t: number) {
      if (isSeeking) {
        pendingTime = t
        return
      }
      isSeeking = true
      video!.currentTime = t
    }

    function engageLock() {
      if (locked) return
      locked = true
      lockedScrollY = window.scrollY
      const b = document.body.style
      b.position = "fixed"
      b.top = `-${lockedScrollY}px`
      b.left = "0"
      b.right = "0"
      b.width = "100%"
      b.height = "100%"
      b.overscrollBehavior = "none"
      section!.style.touchAction = "none"
      overshoot = 0
      setHeroLocked(true)
    }

    function releaseLock() {
      if (!locked) return
      locked = false
      const y = lockedScrollY
      const b = document.body.style
      b.position = ""
      b.top = ""
      b.left = ""
      b.right = ""
      b.width = ""
      b.height = ""
      b.overscrollBehavior = ""
      window.scrollTo(0, y)
      section!.style.touchAction = "pan-y"
      overshoot = 0
      setHeroLocked(false)
    }

    // Reduced motion: never take the page hostage. Show the final state and
    // leave scrolling alone.
    if (reduceMotion) {
      setHeroLocked(false)
      section.style.touchAction = "pan-y"
      if (titleRef.current) titleRef.current.style.transform = "translateY(-15dvh)"
      if (taglineRef.current) {
        taglineRef.current.style.opacity = "1"
        taglineRef.current.style.transform = "translateY(11dvh)"
      }
      if (hintRef.current) hintRef.current.style.opacity = "0"
      if (progressBarRef.current) progressBarRef.current.style.transform = "scaleX(1)"
      return () => {
        video.removeEventListener("loadeddata", onLoadedData)
        video.removeEventListener("seeked", onSeeked)
      }
    }

    // Landing part-way down the page (e.g. browser back): stay unlocked, at the end.
    const previousRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = "manual"
    if (window.scrollY > 1) {
      targetProgress = 1
      currentProgress = 1
      section.style.touchAction = "pan-y"
      setHeroLocked(false)
    } else {
      engageLock()
    }

    function addDelta(deltaY: number) {
      targetProgress = clamp(targetProgress + deltaY / distance, 0, 1)
      if (deltaY < 0) {
        overshoot = 0
      } else if (targetProgress >= 1 && currentProgress > 0.985) {
        overshoot += deltaY
        if (overshoot >= releasePush) releaseLock()
      }
    }

    // Scrolling up with the page already at the very top means "back into the hero".
    function wantsRelock(deltaY: number) {
      return !locked && deltaY < 0 && window.scrollY <= 1
    }

    const onWheel = (e: WheelEvent) => {
      if (isMenuOpen()) return
      const deltaY = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY
      if (wantsRelock(deltaY)) engageLock()
      if (!locked) return
      addDelta(deltaY)
      if (e.cancelable) e.preventDefault()
    }

    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0]?.clientY ?? 0
    }
    const onTouchMove = (e: TouchEvent) => {
      if (isMenuOpen()) return
      const y = e.touches[0]?.clientY ?? touchStartY
      const deltaY = touchStartY - y
      touchStartY = y
      if (wantsRelock(deltaY)) engageLock()
      if (!locked) return
      addDelta(deltaY)
      if (e.cancelable) e.preventDefault()
    }

    const KEY_STEPS: Record<string, number> = {
      ArrowDown: 120,
      ArrowUp: -120,
      PageDown: 480,
      PageUp: -480,
      " ": 480,
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (isMenuOpen()) return
      const target = e.target as Element | null
      if (e.key === " " && target?.closest("a, button")) return
      const step = KEY_STEPS[e.key]
      if (!step) return
      if (wantsRelock(step)) engageLock()
      if (!locked) return
      addDelta(step)
      e.preventDefault()
    }

    // Tabbing to something below the hero has to reach it, so let go.
    const onFocusIn = (e: FocusEvent) => {
      if (!locked || (e.target as Element | null)?.closest("header")) return
      targetProgress = 1
      releaseLock()
    }

    window.addEventListener("wheel", onWheel, { passive: false })
    window.addEventListener("touchstart", onTouchStart, { passive: true })
    window.addEventListener("touchmove", onTouchMove, { passive: false })
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("focusin", onFocusIn)
    // Also bind directly on the element itself, with capture — on some
    // iOS versions a window-level listener alone can lose the race
    // against the browser's own native scroll handling.
    section.addEventListener("touchstart", onTouchStart, { passive: true, capture: true })
    section.addEventListener("touchmove", onTouchMove, { passive: false, capture: true })

    let lastFrameAt = performance.now()

    function frame(now: number) {
      // Time-based, so it eases the same at 60Hz, 120Hz or on a struggling phone.
      const elapsed = Math.min(now - lastFrameAt, 250)
      lastFrameAt = now
      currentProgress += (targetProgress - currentProgress) * (1 - Math.pow(0.82, elapsed / 16.67))
      if (Math.abs(targetProgress - currentProgress) < 0.0004) currentProgress = targetProgress

      // Nothing moved: skip the seek and the style writes.
      if (currentProgress !== renderedProgress && duration > 0) {
        renderedProgress = currentProgress
        seekTo(Math.min(currentProgress * duration, duration - 0.05))

        if (!isPhone && videoRef.current) {
          const scale = 1 + currentProgress * 0.06
          videoRef.current.style.transform = `scale(${scale})`
        }
        if (titleRef.current) {
          const t = 1 - clamp(currentProgress / 0.35, 0, 1)
          titleRef.current.style.opacity = String(t)
          titleRef.current.style.transform = `translateY(${(1 - t) * -24}px) scale(${0.96 + t * 0.04})`
          if (!isPhone) titleRef.current.style.filter = `blur(${(1 - t) * 10}px)`
        }
        if (hintRef.current) {
          // Back on show at the end too: it's the cue to keep going.
          const showHint = currentProgress < 0.001 || currentProgress > 0.97
          hintRef.current.style.opacity = showHint ? "1" : "0"
        }
        if (taglineRef.current) {
          // Mirrors the title's blur-focus treatment, timed as the payoff
          // once the reveal is nearly complete — not a background afterthought.
          const t = clamp((currentProgress - 0.82) / 0.18, 0, 1)
          taglineRef.current.style.opacity = String(t)
          taglineRef.current.style.transform = `translateY(${(1 - t) * 20}px) scale(${0.97 + t * 0.03})`
          if (!isPhone) taglineRef.current.style.filter = `blur(${(1 - t) * 8}px)`
        }
        if (progressBarRef.current) {
          progressBarRef.current.style.transform = `scaleX(${currentProgress})`
        }
      }

      rafId = requestAnimationFrame(frame)
    }

    rafId = requestAnimationFrame(frame)

    return () => {
      video.removeEventListener("loadeddata", onLoadedData)
      video.removeEventListener("seeked", onSeeked)
      window.removeEventListener("wheel", onWheel)
      window.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchmove", onTouchMove)
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("focusin", onFocusIn)
      section.removeEventListener("touchstart", onTouchStart, true)
      section.removeEventListener("touchmove", onTouchMove, true)
      cancelAnimationFrame(rafId)
      releaseLock()
      setHeroLocked(false)
      window.history.scrollRestoration = previousRestoration
    }
  }, [scrubDistance])

  return (
    <div
      ref={sectionRef}
      className={className}
      style={{
        position: "relative",
        height: "100dvh",
        width: "100%",
        overflow: "hidden",
        background: COL_BG,
        touchAction: "none",
        ...style,
      }}
    >
      <video
        ref={videoRef}
        src={videoSrc}
        poster={poster}
        muted
        playsInline
        preload="auto"
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: VIDEO_GRADE,
          transformOrigin: "center center",
          willChange: "transform",
          touchAction: "none",
          pointerEvents: "none",
        }}
      />

      {/* Neon wash: Base blue from the top, magenta from the street below. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(5,7,13,0.5), rgba(0,82,255,0.1) 30%, rgba(139,61,255,0.08) 62%, rgba(255,43,214,0.2) 88%, rgba(5,7,13,0.7))",
          pointerEvents: "none",
        }}
      />

      <div
        ref={titleRef}
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 6%",
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        <h1
          className="neon-word"
          style={{
            margin: 0,
            fontSize: "clamp(84px, 19vw, 280px)",
            letterSpacing: "0.01em",
            display: "inline-block",
            willChange: "transform, opacity",
          }}
        >
          {title}
        </h1>
      </div>

      {tagline && (
        <div
          ref={taglineRef}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 8%",
            textAlign: "center",
            opacity: 0,
            pointerEvents: "none",
          }}
        >
          <p
            className="inked"
            style={{
              margin: 0,
              maxWidth: "18ch",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "clamp(32px, 5vw, 72px)",
              lineHeight: 1.08,
              color: COL_TEXT,
              textShadow: "0 6px 30px rgba(5,7,13,0.75)",
            }}
          >
            {tagline}
          </p>
        </div>
      )}

      <div
        ref={hintRef}
        style={{
          position: "absolute",
          left: "50%",
          bottom: "clamp(24px, 6vh, 48px)",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          color: COL_TEXT,
          fontFamily: "var(--font-display)",
          fontSize: "clamp(12px, 1.4vw, 14px)",
          fontWeight: 600,
          letterSpacing: "0.3em",
          textShadow: "0 1px 8px rgba(5,7,13,0.9)",
          transition: "opacity 0.4s ease",
          pointerEvents: "none",
        }}
      >
        <span>{scrollHint}</span>
        <svg width="14" height="18" viewBox="0 0 14 18" aria-hidden style={{ animation: "metro-hero-bounce 1.6s ease-in-out infinite" }}>
          <style>{`
            @keyframes metro-hero-bounce {
              0%, 100% { transform: translateY(0); opacity: 0.5; }
              50% { transform: translateY(5px); opacity: 1; }
            }
            @media (prefers-reduced-motion: reduce) {
              svg { animation: none !important; }
            }
          `}</style>
          <path d="M7 1 L7 17 M2 12 L7 17 L12 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Thin progress line — fills as the video advances. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 3,
          background: "rgba(255,255,255,0.12)",
        }}
      >
        <div
          ref={progressBarRef}
          style={{
            height: "100%",
            width: "100%",
            background: "linear-gradient(90deg, var(--color-cyan), var(--color-magenta))",
            transform: "scaleX(0)",
            transformOrigin: "left center",
          }}
        />
      </div>
    </div>
  )
}
