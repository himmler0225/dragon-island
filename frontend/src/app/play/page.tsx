import { TopBar } from "@/components";
import GameScreenLoader from "@/components/game/GameScreenLoader";

export const metadata = { title: "Chơi" };

export default function PlayPage() {
  return (
    <div className="page" style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <TopBar slim active="/play" />
      {/* the game fills the rest of the window */}
      <main style={{ flex: 1, minHeight: 0 }}>
        <GameScreenLoader />
      </main>
    </div>
  );
}
