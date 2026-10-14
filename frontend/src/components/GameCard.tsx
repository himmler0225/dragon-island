interface GameCardProps {
  id: string;
  title: string;
  players: number;
  rating: number;
  category: string;
}

export default function GameCard({ id, title, players, rating, category }: GameCardProps) {
  return (
    <a href={`/games/${id}`} className="game-card">
      <div className="game-card-thumb">
        <div className="game-card-thumb-inner">🐉</div>
        <div className="game-card-play">
          <svg viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
      </div>
      <div className="game-card-body">
        <h3 className="game-card-title">{title}</h3>
        <div className="game-card-meta">
          <span>{players.toLocaleString()} người chơi</span>
          <span className="game-card-rating">★ {rating}</span>
        </div>
        <span className="game-card-category">{category}</span>
      </div>
    </a>
  );
}
