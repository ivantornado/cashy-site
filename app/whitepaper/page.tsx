import type { Metadata } from "next";
import Link from "next/link";
import { ComingSoon } from "@/components/coming-soon";
import pages from "@/content/pages.json";
import { asset } from "@/lib/utils";

const { title, description, line, mascot, baseCity, roadmap } = pages.whitepaper;

export const metadata: Metadata = { title, description };

const pill = "btn-outline h-12 px-6 text-lg";

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
