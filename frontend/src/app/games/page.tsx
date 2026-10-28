import { TopBar, Footer, GameCard } from "@/components";
import { assetUrl } from "@/game/config/assets";

const allGames = [
  {
    id: "dragon-island",
    title: "Dragon Island",
    art: assetUrl("islands/meadow.png"),
    players: 15420,
    rating: 4.8,
    category: "Nuôi thú",
  },
  {
    id: "magic-garden",
    title: "Magic Garden",
    players: 8930,
    rating: 4.5,
    category: "Trồng cây",
  },
  {
    id: "ocean-quest",
    title: "Ocean Quest",
    players: 12300,
    rating: 4.6,
    category: "Phiêu lưu",
  },
  {
    id: "sky-kingdom",
    title: "Sky Kingdom",
    players: 6700,
    rating: 4.3,
    category: "Xây dựng",
  },
  {
    id: "dragon-war",
    title: "Dragon War",
    players: 21000,
    rating: 4.9,
    category: "Chiến đấu",
  },
  {
    id: "pet-paradise",
    title: "Pet Paradise",
    players: 5400,
    rating: 4.2,
    category: "Nuôi thú",
  },
  {
    id: "crystal-cave",
    title: "Crystal Cave",
    players: 7800,
    rating: 4.4,
    category: "Khám phá",
  },
  {
    id: "fairy-tale",
    title: "Fairy Tale",
    players: 9200,
    rating: 4.7,
    category: "Cổ tích",
  },
];

const categories = ["Tất cả", "Nuôi thú", "Chiến đấu", "Trồng cây", "Phiêu lưu", "Xây dựng"];

export const metadata = { title: "Kho game" };

export default function GamesPage() {
  return (
    <div className="page">
      <TopBar active="/games" />

      <main className="main">
        <div className="page-container">
          <div className="page-head">
            <h1>Kho game</h1>
            <p>Khám phá các game hot nhất</p>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <div className="row">
              <input
                type="text"
                placeholder="Tìm kiếm game..."
                aria-label="Tìm kiếm game"
                style={{
                  flex: 1,
                  minWidth: 240,
                  height: 42,
                  padding: "0 16px",
                  fontSize: 14,
                  color: "var(--text)",
                  background: "var(--bg-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                }}
              />
              <div className="row" style={{ gap: 8 }}>
                {categories.map((cat, i) => (
                  <button key={cat} className={`tag${i === 0 ? " tag--gold" : ""}`} type="button">
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid-2">
            {allGames.map(game => (
              <GameCard key={game.id} {...game} />
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
