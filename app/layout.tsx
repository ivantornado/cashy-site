import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import site from "@/content/site.json";
import { asset } from "@/lib/utils";
import "./globals.css";

// Latin-only subsets of the supplied fonts. Cynatar is for the big CASHY headings, Noto Sans for everything else.
const cynatar = localFont({ src: "./fonts/Cynatar.woff2", variable: "--font-cynatar" });
const notoSans = localFont({
  src: [
    { path: "./fonts/NotoSans-Regular.woff2", weight: "400" },
    { path: "./fonts/NotoSans-Medium.woff2", weight: "500" },
    { path: "./fonts/NotoSans-SemiBold.woff2", weight: "600" },
    { path: "./fonts/NotoSans-Bold.woff2", weight: "700" },
  ],
  variable: "--font-noto-sans",
});
// Only the katakana the skyline signs use. M PLUS Rounded 1c, OFL licence.
const signFont = localFont({ src: "./fonts/sign-subset.woff2", variable: "--font-sign", weight: "800" });

export const metadata: Metadata = {
  title: { default: `${site.name} ${site.ticker}`, template: `%s · ${site.name}` },
  description: site.description,
};

export const viewport: Viewport = {
  themeColor: "#05070d",
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" className={`${cynatar.variable} ${notoSans.variable} ${signFont.variable}`}>
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
        <div aria-hidden className="grain" style={{ backgroundImage: `url(${asset("/art/grain.png")})` }} />
      </body>
    </html>
  );
}
