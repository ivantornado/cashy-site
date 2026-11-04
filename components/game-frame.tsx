"use client";

import { useRef } from "react";

/**
 * The game sits inside the page, so visitors never leave Cashy. It fills the screen height under the
 * site header, keeping the game's own shape, and takes the keyboard as soon as it has loaded or been clicked.
 */
export function GameFrame({ src, title }: { src: string; title: string }) {
  const frame = useRef<HTMLIFrameElement>(null);

  return (
    <div
      className="mx-auto overflow-hidden rounded-2xl border-[3px] border-base bg-ink shadow-[0_4px_36px_rgb(2_79_246_/_0.5)]"
      style={{ width: "min(100%, calc((100svh - 6.5rem) * 706 / 720))", aspectRatio: "706 / 720" }}
      onClick={() => frame.current?.focus()}
    >
      <iframe
        ref={frame}
        src={src}
        title={title}
        allow="autoplay; fullscreen"
        className="block size-full border-0"
        onLoad={() => frame.current?.focus()}
      />
    </div>
  );
}
