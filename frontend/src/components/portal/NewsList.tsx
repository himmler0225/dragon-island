import Link from "next/link";

export default function NewsList() {
  const news = [
    {
      id: "1",
      title: "Cập nhật phiên bản mới: Rồng lửa đã có mặt!",
      date: "2026-10-13",
      views: 1250,
      category: "Cập nhật"
    },
    {
      id: "2",
      title: "Hướng dẫn chơi Dragon Island cho người mới",
      date: "2026-10-12",
      views: 890,
      category: "Hướng dẫn"
    },
    {
      id: "3",
      title: "Sự kiện Halloween: Rồng ma tham gia cuộc chiến!",
      date: "2026-10-10",
      views: 2100,
      category: "Sự kiện"
    }
  ];

  return (
    <div>
      <div className="section-header">
        <h3 className="section-title">Tin tức</h3>
        <Link href="/news" className="btn btn-ghost btn-sm">Xem tất cả</Link>
      </div>

      <div className="space-y-3">
        {news.map((item) => (
          <Link key={item.id} href={`/news/${item.id}`} className="news-item">
            <div className="news-item-thumb">📰</div>
            <div className="news-item-content">
              <span className="news-item-category">{item.category}</span>
              <div className="news-item-title">{item.title}</div>
              <div className="news-item-meta">
                {item.date} · {item.views.toLocaleString()} lượt xem
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
