import Link from "next/link";
import { BuyButton } from "@/components/ui/buy-button";
import { Wordmark } from "@/components/ui/wordmark";
import nav from "@/content/nav.json";
import site from "@/content/site.json";

export function SiteFooter() {
  const socials = [
    { label: "X", href: site.xUrl },
    { label: "Telegram", href: site.telegramUrl },
  ].filter((social) => social.href);

  return (
    <footer className="relative bg-ink px-4 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-14 md:px-8 md:pt-20">
      <div className="mx-auto grid max-w-[1500px] gap-10 md:grid-cols-[1fr_auto] md:items-start">
        <div>
          <Wordmark className="text-5xl md:text-6xl" />
          <p className="mt-3 max-w-md text-lg text-mist">{site.footerLine}</p>
        </div>
        <div className="flex flex-col gap-8 md:items-end">
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-5 gap-y-2 md:justify-end">
              {nav.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="font-display text-lg font-medium text-paper/85 transition-colors duration-150 hover:text-cyan">
                    {item.label}
                  </Link>
                </li>
              ))}
              {socials.map((social) => (
                <li key={social.label}>
                  <a href={social.href} target="_blank" rel="noopener noreferrer" className="font-display text-lg font-medium text-paper/85 transition-colors duration-150 hover:text-cyan">
                    {social.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <BuyButton className="h-12 self-start px-6 text-lg md:self-end" />
        </div>
      </div>
      <p className="mx-auto mt-12 max-w-[1500px] border-t border-paper/15 pt-6 text-sm leading-relaxed text-mist">
        {site.disclaimer}
      </p>
    </footer>
  );
}
