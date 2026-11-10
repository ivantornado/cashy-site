import type { Metadata } from "next";
import Link from "next/link";
import { ComingSoon } from "@/components/coming-soon";
import pages from "@/content/pages.json";
import { asset } from "@/lib/utils";

const { title, description, line, mascot, baseCity, roadmap } = pages.whitepaper;

export const metadata: Metadata = { title, description };

const pill = "inline-flex h-12 items-center rounded-full border-2 border-paper/40 px-6 font-display text-lg font-semibold text-paper transition-colors duration-150 hover:border-cyan hover:text-cyan";

export default function WhitepaperPage() {
  return (
    <ComingSoon
      title={title}
      line={line}
      mascot={mascot}
      actions={
        <>
          {/* Base City is its own full-screen page, so a plain link rather than the in-app router. */}
          <a href={asset(baseCity.href)} className={pill}>
            {baseCity.label}
          </a>
          <Link href={roadmap.href} className={pill}>
            {roadmap.label}
          </Link>
        </>
      }
    />
  );
}
