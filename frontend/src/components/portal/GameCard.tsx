import Link from "next/link";

export interface GameCardProps {
  id: string;
  title: string;
  /** Cover art in /public; falls back to a gradient block when missing. */
  art?: string;
  players: number;
  rating: number;
  category: string;
}

export default function GameCard({ id, title, art, players, rating, category }: GameCardProps) {
  return (
    <Link href={`/games/${id}`} className="game-card">
      <div className="game-card-art">
        {art ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={art} alt="" />
        ) : (
          <span style={{ fontSize: 48, opacity: 0.6 }}>🐉</span>
        )}
        <span className="game-card-play">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </div>
      <div className="game-card-body">
        <h3>{title}</h3>
        <div className="game-card-meta">
          <span>{players.toLocaleString("vi-VN")} người chơi</span>
          <span className="game-card-rating">★ {rating}</span>
        </div>
        <span className="tag" style={{ marginTop: 10 }}>{category}</span>
      </div>
    </Link>
  );
}
