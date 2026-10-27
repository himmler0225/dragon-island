import { TopBar, Footer } from "@/components";

const newsItems = [
  { id: "1", title: "Cập nhật phiên bản mới: Rồng lửa đã có mặt!", date: "2026-10-13", views: 1250, category: "Cập nhật", featured: true },
  { id: "2", title: "Chơi Dragon Island cho người mới", date: "2026-10-12", views: 890, category: "Hướng dẫn", featured: false },
  { id: "3", title: "Sự kiện Halloween: Rồng ma tham gia cuộc chiến!", date: "2026-10-10", views: 2100, category: "Sự kiện", featured: true },
  { id: "4", title: "Top 5 rồng mạnh nhất trong Dragon Island", date: "2026-10-08", views: 3400, category: "Bảng xếp hạng", featured: false },
  { id: "5", title: "Mẹo chơi hiệu quả — tiết kiệm thời gian", date: "2026-10-05", views: 780, category: "Hướng dẫn", featured: false },
];

const categories = [
  { name: "Cập nhật", count: 5 },
  { name: "Sự kiện", count: 8 },
  { name: "Hướng dẫn", count: 12 },
  { name: "Bảng xếp hạng", count: 3 },
];

export const metadata = { title: "Tin tức" };

export default function NewsPage() {
  const featured = newsItems.filter(n => n.featured);
  const regular = newsItems.filter(n => !n.featured);

  return (
    <div className="page">
      <TopBar active="/news" />

      <main className="main">
        <div className="page-container">
          <div className="page-head">
            <h1>Tin tức &amp; Sự kiện</h1>
            <p>Cập nhật mới nhất</p>
          </div>

          <div className="split">
            <div className="stack" style={{ gap: 24 }}>
              <section>
                <h2 className="section-title" style={{ marginBottom: 16 }}>Tin nổi bật</h2>
                <div className="stack" style={{ gap: 12 }}>
                  {featured.map(item => (
                    <a key={item.id} href={`/news/${item.id}`} className="news-item">
                      <div className="news-item-art">📰</div>
                      <div className="news-item-body">
                        <span className="news-item-cat">{item.category}</span>
                        <div className="news-item-title">{item.title}</div>
                        <div className="news-item-meta">
                          {item.date} · {item.views.toLocaleString("vi-VN")} lượt xem
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="section-title" style={{ marginBottom: 16 }}>Tin mới nhất</h2>
                <div className="stack" style={{ gap: 12 }}>
                  {regular.map(item => (
                    <a key={item.id} href={`/news/${item.id}`} className="news-item">
                      <div className="news-item-art">📰</div>
                      <div className="news-item-body">
                        <span className="news-item-cat">{item.category}</span>
                        <div className="news-item-title">{item.title}</div>
                        <div className="news-item-meta">{item.date}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            </div>

            <aside className="stack">
              <div className="card">
                <h4>Danh mục</h4>
                <div>
                  {categories.map(cat => (
                    <div
                      key={cat.name}
                      className="row"
                      style={{
                        justifyContent: "space-between",
                        padding: "10px 0",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <span style={{ color: "var(--text-2)" }}>{cat.name}</span>
                      <span className="tag">{cat.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="card"
                style={{ background: "linear-gradient(135deg, #1e3a5f, #0f172a)" }}
              >
                <h4>Liên kết nhanh</h4>
                <div className="stack" style={{ gap: 8 }}>
                  <a href="/play" className="btn btn-primary btn-block">Chơi ngay</a>
                  <a href="/games/dragon-island" className="btn btn-secondary btn-block">Thông tin game</a>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
