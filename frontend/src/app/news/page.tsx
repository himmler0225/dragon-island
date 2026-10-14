import { TopBar, Footer } from "@/components";

const newsItems = [
  { id: "1", title: "Cập nhật phiên bản mới: Rồng lửa đã có mặt!", date: "2026-10-13", views: 1250, category: "Cập nhật", featured: true },
  { id: "2", title: "Hướng dẫn chơi Dragon Island cho người mới", date: "2026-10-12", views: 890, category: "Hướng dẫn", featured: false },
  { id: "3", title: "Sự kiện Halloween: Rồng ma tham gia cuộc chiến!", date: "2026-10-10", views: 2100, category: "Sự kiện", featured: true },
  { id: "4", title: "Top 5 rồng mạnh nhất trong Dragon Island", date: "2026-10-08", views: 3400, category: "Bảng xếp hạng", featured: false },
  { id: "5", title: "Mẹo chơi game hiệu quả - Tiết kiệm thời gian", date: "2026-10-05", views: 780, category: "Hướng dẫn", featured: false },
];

const categories = [
  { name: "Cập nhật", count: 5 },
  { name: "Sự kiện", count: 8 },
  { name: "Hướng dẫn", count: 12 },
  { name: "Bảng xếp hạng", count: 3 },
];

export default function NewsPage() {
  const featured = newsItems.filter(n => n.featured);
  const regular = newsItems.filter(n => !n.featured);

  return (
    <div>
      <TopBar />
      
      <main className="main">
        <div className="page-container">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">Tin tức & Sự kiện</h1>
            <p style={{ color: 'var(--color-text-muted)' }}>Cập nhật mới nhất</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Featured */}
              <section>
                <h2 className="section-title mb-4">Tin nổi bật</h2>
                {featured.map((item) => (
                  <a key={item.id} href={`/news/${item.id}`} className="news-item mb-4 block">
                    <div className="news-item-thumb" style={{ width: '120px', height: '80px' }}>📰</div>
                    <div className="news-item-content">
                      <span className="news-item-category">{item.category}</span>
                      <div className="news-item-title">{item.title}</div>
                      <div className="news-item-meta">{item.date} · {item.views.toLocaleString()} lượt xem</div>
                    </div>
                  </a>
                ))}
              </section>

              {/* Regular */}
              <section>
                <h2 className="section-title mb-4">Tin mới nhất</h2>
                {regular.map((item) => (
                  <a key={item.id} href={`/news/${item.id}`} className="news-item mb-3 block">
                    <div className="news-item-thumb">📰</div>
                    <div className="news-item-content">
                      <span className="news-item-category">{item.category}</span>
                      <div className="news-item-title">{item.title}</div>
                      <div className="news-item-meta">{item.date}</div>
                    </div>
                  </a>
                ))}
              </section>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="card">
                <h3 className="text-sm font-semibold mb-3">Danh mục</h3>
                {categories.map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0">
                    <span style={{ color: 'var(--color-text-secondary)' }}>{cat.name}</span>
                    <span className="tag">{cat.count}</span>
                  </div>
                ))}
              </div>

              <div className="card" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)' }}>
                <h3 className="text-sm font-semibold mb-3">Quick links</h3>
                <div className="space-y-2">
                  <a href="/play" className="btn btn-primary w-full">Chơi ngay</a>
                  <a href="/games/dragon-island" className="btn btn-secondary w-full">Thông tin game</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
