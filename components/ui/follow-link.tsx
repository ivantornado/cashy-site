import site from "@/content/site.json";
import { cn } from "@/lib/utils";

/** "Follow on X", as an outlined pill next to the Buy button. Hidden while no X link is set. */
export function FollowLink({ className }: { className?: string }) {
  if (!site.xUrl) return null;
  return (
    <a
      href={site.xUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center justify-center rounded-full border-2 border-paper/40 font-display font-semibold whitespace-nowrap text-paper transition-colors duration-150 hover:border-cyan hover:text-cyan",
        className,
      )}
    >
      {site.followLabel}
    </a>
  );
}
