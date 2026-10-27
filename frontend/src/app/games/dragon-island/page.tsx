import { TopBar, Footer, Breadcrumb } from "@/components";

export const metadata = { title: { absolute: "Dragon Island" } };

const HIGHLIGHTS = [
  { label: "Người chơi", value: "15.420" },
  { label: "Đánh giá", value: "★ 4.8" },
  { label: "Loài rồng", value: "18" },
  { label: "Đảo", value: "3" },
];

export default function DragonIslandPage() {
  return (
    <div className="page">
      <TopBar active="/games" />

      <main className="main">
        <div className="page-container">
          <Breadcrumb items={[{ label: "Kho game", href: "/games" }, { label: "Dragon Island" }]} />

          <div className="split">
            {/* Live game: the real /play page in a frame */}
            <div>
              <div
                style={{
                  position: "relative",
                  aspectRatio: "16 / 10",
                  borderRadius: "var(--radius)",
                  overflow: "hidden",
                  border: "1px solid var(--border)",
                  background: "#0a0f1a",
                }}
              >
                <iframe
                  src="/play"
                  title="Dragon Island — chơi thử"
                  allow="fullscreen; autoplay"
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
                />
              </div>

              <div className="grid-3" style={{ marginTop: 20 }}>
                {["meadow", "jungle", "desert"].map(id => (
                  <div key={id} className="card" style={{ padding: 12 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/islands/${id}.png`}
                      alt=""
                      style={{ width: "100%", aspectRatio: "1.45", objectFit: "contain" }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Info */}
            <aside className="stack">
              <div className="info-panel">
                <div className="info-panel-head">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/ui/logo.png" alt="" />
                  <div>
                    <b>Dragon Island</b>
                    <small>Nuôi thú · Chiến đấu</small>
                  </div>
                </div>
                <div className="info-panel-body">
                  <div className="grid-2" style={{ gap: 10, marginBottom: 16 }}>
                    {HIGHLIGHTS.map(h => (
                      <div key={h.label} className="stat">
                        <b>{h.value}</b>
                        <small>{h.label}</small>
                      </div>
                    ))}
                  </div>
                  <a href="/play" className="btn btn-primary btn-block">Chơi ngay</a>
                </div>
              </div>

              <div className="card">
                <h4>Thể loại</h4>
                <div className="row" style={{ gap: 8 }}>
                  <span className="tag">Nuôi thú</span>
                  <span className="tag">Chiến đấu</span>
                  <span className="tag">Phiêu lưu</span>
                </div>
              </div>

              <div className="card">
                <h4>Mô tả</h4>
                <p style={{ color: "var(--text-2)", fontSize: 14 }}>
                  Dragon Island là game nuôi rồng đầy màu sắc. Thu thập, nuôi dưỡng và chiến đấu cùng rồng
                  trên ba hòn đảo nổi giữa biển mây.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
