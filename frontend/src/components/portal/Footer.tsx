import Link from "next/link";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="page-container">
        <div className="footer-links">
          <Link href="/">Trang chủ</Link>
          <Link href="/games">Kho game</Link>
          <Link href="/news">Tin tức</Link>
          <Link href="/play">Chơi ngay</Link>
        </div>
        <p>© 2026 Dragon Island. All rights reserved.</p>
      </div>
    </footer>
  );
}
