import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import pages from "@/content/pages.json";

const { title, description, line } = pages.printer;

export const metadata: Metadata = { title, description };

export default function PrinterPage() {
  return <ComingSoon title={title} line={line} />;
}
