interface GameFrameProps {
  children: React.ReactNode;
  level?: number;
  hp?: number;
  maxHp?: number;
  gold?: number;
}

export default function GameFrame({ 
  children, 
  level = 1, 
  hp = 100, 
  maxHp = 100, 
  gold = 0 
}: GameFrameProps) {
  const hpPercent = (hp / maxHp) * 100;

  return (
    <div className="game-frame">
      {/* HUD */}
      <div className="game-frame-hud">
        <div className="game-frame-hud-left">
          <div className="hud-item">
            <span className="hud-item-icon">🏆</span>
            <span className="hud-item-value">{level}</span>
          </div>
          <div className="hud-item">
            <span className="hud-item-icon">❤️</span>
            <div className="hp-bar">
              <div className="hp-bar-fill" style={{ width: `${hpPercent}%` }} />
            </div>
          </div>
        </div>
        <div className="game-frame-hud-right">
          <div className="hud-item">
            <span className="hud-item-icon">💰</span>
            <span className="hud-item-value">{gold.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="game-frame-canvas">
        {children}
      </div>
    </div>
  );
}
