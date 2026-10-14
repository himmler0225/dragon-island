import { TopBar, Footer, GameCard } from "@/components";

const allGames = [
  { id: "dragon-island", title: "Dragon Island", players: 15420, rating: 4.8, category: "Nuôi thú" },
  { id: "magic-garden", title: "Magic Garden", players: 8930, rating: 4.5, category: "Trồng cây" },
  { id: "ocean-quest", title: "Ocean Quest", players: 12300, rating: 4.6, category: "Phiêu lưu" },
  { id: "sky-kingdom", title: "Sky Kingdom", players: 6700, rating: 4.3, category: "Xây dựng" },
  { id: "dragon-war", title: "Dragon War", players: 21000, rating: 4.9, category: "Chiến đấu" },
  { id: "pet-paradise", title: "Pet Paradise", players: 5400, rating: 4.2, category: "Nuôi thú" },
  { id: "crystal-cave", title: "Crystal Cave", players: 7800, rating: 4.4, category: "Khám phá" },
  { id: "fairy-tale", title: "Fairy Tale", players: 9200, rating: 4.7, category: "Cổ tích" },
];

const categories = ["Tất cả", "Nuôi thú", "Chiến đấu", "Trồng cây", "Phiêu lưu", "Xây dựng"];

export default function GamesPage() {
  return (
    <div>
      <TopBar />
      
      <main className="main">
        <div className="page-container">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">Kho game</h1>
            <p style={{ color: 'var(--color-text-muted)' }}>Khám phá các game hot nhất</p>
          </div>

          {/* Filters */}
          <div className="card mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              <input
                type="text"
                placeholder="Tìm kiếm game..."
                className="flex-1 min-w-64 h-10 px-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
              />
              <div className="flex gap-2 flex-wrap">
                {categories.map((cat, i) => (
                  <button
                    key={cat}
                    className={`tag ${i === 0 ? 'bg-[var(--color-accent)] text-white' : ''}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Games Grid */}
          <div className="games-grid">
            {allGames.map((game) => (
              <GameCard key={game.id} {...game} />
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
