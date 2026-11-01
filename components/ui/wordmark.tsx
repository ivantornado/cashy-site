import { cn } from "@/lib/utils";

// TODO: final logo. Text-only placeholder until the team's logo arrives.
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inked font-display font-bold tracking-wide text-note", className)}>CASHY</span>
  );
}
