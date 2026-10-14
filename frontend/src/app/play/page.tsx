import { TopBar } from "@/components";
import GameScreenLoader from "@/components/game/GameScreenLoader";

export const metadata = { title: "Chơi Dragon Island" };

export default function PlayPage() {
  return (
    <div style={{ background: "#0a0a0f", height: "100dvh", display: "flex", flexDirection: "column" }}>
      <TopBar />
      {/* the game fills the rest of the window */}
      <main style={{ flex: 1, minHeight: 0 }}>
        <GameScreenLoader />
      </main>
    </div>
  );
}
