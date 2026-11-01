import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito_Sans } from "next/font/google";
import localFont from "next/font/local";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import site from "@/content/site.json";
import { asset } from "@/lib/utils";
import "./globals.css";

const fredoka = Fredoka({ subsets: ["latin"], variable: "--font-fredoka" });
const nunitoSans = Nunito_Sans({ subsets: ["latin"], variable: "--font-nunito-sans" });
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
    <html lang="en-GB" className={`${fredoka.variable} ${nunitoSans.variable} ${signFont.variable}`}>
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
        <div aria-hidden className="grain" style={{ backgroundImage: `url(${asset("/art/grain.png")})` }} />
      </body>
    </html>
  );
}
