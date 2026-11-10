import type { Metadata } from "next";
import { GamePage } from "@/components/arcade/game-page";
import pages from "@/content/pages.json";

const game = pages.arcade.games.find((g) => g.id === "cashy-tower")!;

export const metadata: Metadata = { title: game.title, description: game.description };

export default function CashyTowerPage() {
  return <GamePage game={game} />;
}
