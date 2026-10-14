import Link from "next/link";

const NAV = [
  { href: "/", label: "Trang chủ" },
  { href: "/#rong", label: "Rồng" },
  { href: "/#dao", label: "Đảo" },
  { href: "/news", label: "Tin tức" },
];

export default function TopBar() {
  return (
    <header className="header">
      <div className="page-container">
        <div className="header-inner">
          {/* Logo */}
          <Link href="/" className="logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ui/logo.png" alt="Dragon Island" style={{ height: 44, width: "auto" }} />
          </Link>

          {/* Nav */}
          <nav className="nav-links">
            {NAV.map(n => (
              <Link key={n.href} href={n.href} className="nav-link">{n.label}</Link>
            ))}
          </nav>

          <Link href="/play" className="btn btn-primary">Chơi ngay</Link>
        </div>
      </div>
    </header>
  );
}
