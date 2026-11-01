import site from "@/content/site.json";
import { cn } from "@/lib/utils";

export function BuyButton({ className }: { className?: string }) {
  return (
    <a href={site.buyUrl} target="_blank" rel="noopener noreferrer" className={cn("btn-buy", className)}>
      {site.buyLabel}
    </a>
  );
}
