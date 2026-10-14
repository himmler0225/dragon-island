import { TopBar, Footer, Breadcrumb, GameFrame } from "@/components";

export default function DragonIslandPage() {
  return (
    <div>
      <TopBar />
      
      <main className="main">
        <div className="page-container">
          <Breadcrumb items={[{ label: "Game", href: "/games" }, { label: "Dragon Island" }]} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Game Area */}
            <div className="lg:col-span-2">
              <GameFrame level={12} hp={85} maxHp={100} gold={2500}>
                <div className="text-center">
                  <div className="text-6xl mb-4 opacity-60">🐉</div>
                  <h2 className="text-xl font-semibold mb-2">Dragon Island</h2>
                  <p style={{ color: 'var(--color-text-muted)' }} className="mb-4">Game canvas</p>
                  <a href="/play" className="btn btn-primary">Chơi ngay</a>
                </div>
              </GameFrame>

              {/* Screenshots */}
              <div className="mt-6">
                <h3 className="text-base font-semibold mb-4">Hình ảnh</h3>
                <div className="grid grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="aspect-video rounded-lg flex items-center justify-center text-3xl" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
                      🐉
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Info Panel */}
            <div className="space-y-4">
              <div className="info-panel">
                <div className="info-panel-header">
                  <div className="info-panel-icon">🐉</div>
                  <div>
                    <div className="info-panel-title">Dragon Island</div>
                    <div className="info-panel-subtitle">Nuôi thú</div>
                  </div>
                </div>
                <div className="info-panel-body">
                  <div className="flex gap-4 mb-4">
                    <div className="flex-1 text-center p-3 rounded-lg" style={{ background: 'var(--color-bg-hover)' }}>
                      <div className="stat-value text-lg">15,420</div>
                      <div className="stat-label">Người chơi</div>
                    </div>
                    <div className="flex-1 text-center p-3 rounded-lg" style={{ background: 'var(--color-bg-hover)' }}>
                      <div className="stat-value text-lg">★ 4.8</div>
                      <div className="stat-label">Đánh giá</div>
                    </div>
                  </div>
                  <a href="/play" className="btn btn-primary w-full">Chơi ngay</a>
                </div>
              </div>

              <div className="card">
                <h4 className="text-sm font-semibold mb-3">Thể loại</h4>
                <div className="flex flex-wrap gap-2">
                  <span className="tag">Nuôi thú</span>
                  <span className="tag">Chiến đấu</span>
                  <span className="tag">Phiêu lưu</span>
                </div>
              </div>

              <div className="card">
                <h4 className="text-sm font-semibold mb-3">Mô tả</h4>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                  Dragon Island là game nuôi rồng đầy màu sắc. Thu thập, nuôi dưỡng và chiến đấu cùng rồng.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
