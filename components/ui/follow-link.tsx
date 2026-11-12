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
      className={cn("btn-outline", className)}
    >
      {site.followLabel}
    </a>
  );
}
