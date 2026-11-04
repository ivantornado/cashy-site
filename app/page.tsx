import { AboutCoin } from "@/components/home/about-coin";
import { Hype } from "@/components/home/hype";
import { FarSkyline, MidSkyline, Moon, NearSkyline, Rooftop, Stars } from "@/components/home/skyline-art";
import { SmoothScroll } from "@/components/home/smooth-scroll";
import { ParallaxComponent } from "@/components/ui/parallax-scrolling";
import MetroHero from "@/components/ui/scroll-locked-video-hero";
import home from "@/content/home.json";
import { asset } from "@/lib/utils";

const layerClass = "absolute inset-0 size-full will-change-transform";

export default function HomePage() {
  const { hero, about, skyline, hype } = home;

  return (
    <main>
      <SmoothScroll />
      <MetroHero
        videoSrc={asset(hero.videoSrc)}
        poster={asset(hero.poster)}
        title={hero.title}
        tagline={hero.tagline}
        scrollHint={hero.scrollHint}
      />
      <AboutCoin headline={about.headline} support={about.support} />
      <ParallaxComponent label={skyline.label}>
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-[#04050f] via-[#10174a] to-[#4a1c86]" />
        <Stars className="absolute inset-0 size-full" />
        <div data-parallax-layer="moon" className={layerClass}>
          <Moon className="size-full" />
        </div>
        <div data-parallax-layer="far" className={layerClass}>
          <FarSkyline className="size-full" />
        </div>
        <div data-parallax-layer="mid" className={layerClass}>
          <MidSkyline className="size-full" />
        </div>
        <div data-parallax-layer="word" className={`${layerClass} flex justify-center`}>
          <span aria-hidden className="neon-word mt-[13svh] text-[min(29vw,35svh)] md:mt-[11svh] md:text-[min(23vw,38svh)]">
            {skyline.word}
          </span>
        </div>
        <div data-parallax-layer="near" className={layerClass}>
          <NearSkyline className="size-full" />
        </div>
        <div data-parallax-layer="roof" className={layerClass}>
          <Rooftop mascot={skyline.mascot} className="size-full" />
        </div>
        <div aria-hidden className="rain" />
        <div data-parallax-wash aria-hidden className="absolute inset-0 bg-black opacity-0" />
      </ParallaxComponent>
      <Hype eyebrow={hype.eyebrow} title={hype.title} lede={hype.lede} points={hype.points} />
    </main>
  );
}
