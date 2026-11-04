"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BuyButton } from "@/components/ui/buy-button";
import { Wordmark } from "@/components/ui/wordmark";
import nav from "@/content/nav.json";
import { setMenuOpen } from "@/lib/scroll-state";
import { cn } from "@/lib/utils";

type NavItem = { label: string; href: string; placeholder?: string };
const items: NavItem[] = nav;

function isActive(item: NavItem, pathname: string) {
  if (item.placeholder) return false;
  const path = pathname.replace(/\/$/, "") || "/";
  return path === item.href;
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    const toggle = toggleRef.current;
    const page = [document.querySelector("main"), document.querySelector("footer")];
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;

    setMenuOpen(true);
    root.style.overflow = "hidden";
    page.forEach((el) => el?.setAttribute("inert", ""));
    firstLinkRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      setMenuOpen(false);
      root.style.overflow = previousOverflow;
      page.forEach((el) => el?.removeAttribute("inert"));
      window.removeEventListener("keydown", onKeyDown);
      toggle?.focus();
    };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink/85 to-transparent"
      />
      <div className="relative z-10 mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-3 px-4 pt-[env(safe-area-inset-top)] md:h-20 md:px-8">
        <Link href="/" aria-label="Cashy, home" className="rounded-md" onClick={() => setOpen(false)}>
          <Wordmark className="text-2xl md:text-3xl" />
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {items.map((item) => {
              const active = isActive(item, pathname);
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-full px-3.5 py-2 font-display text-[17px] font-medium text-paper/85 transition-colors duration-150 hover:text-cyan",
                      active && "text-cyan underline decoration-base decoration-[3px] underline-offset-[7px]",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <BuyButton className="h-10 px-4 text-[15px] md:h-11 md:px-5 md:text-base" />
          <button
            ref={toggleRef}
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((v) => !v)}
            className="grid size-11 place-items-center rounded-full text-paper lg:hidden"
          >
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              {open ? (
                <path d="M6 6l14 14M20 6L6 20" />
              ) : (
                <path d="M4 8h18M4 13h18M4 18h12" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div id="site-menu" className="fixed inset-0 z-0 flex flex-col justify-center bg-ink px-6 pt-20 lg:hidden">
          <nav aria-label="Menu">
            <ul className="flex flex-col gap-1">
              {items.map((item, i) => {
                const active = isActive(item, pathname);
                return (
                  <li key={item.label}>
                    <Link
                      ref={i === 0 ? firstLinkRef : undefined}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "block py-2 font-display text-[40px] leading-tight font-semibold text-paper",
                        active && "text-cyan",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}
