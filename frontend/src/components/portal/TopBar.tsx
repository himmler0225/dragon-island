import Link from "next/link";

const NAV = [
  { href: "/", label: "Trang chủ" },
  { href: "/#rong", label: "Rồng" },
  { href: "/#dao", label: "Đảo" },
  { href: "/games", label: "Kho game" },
  { href: "/news", label: "Tin tức" },
];

/** `active` marks the current page so the nav can highlight it. */
export default function TopBar({ active, slim = false }: { active?: string; slim?: boolean }) {
  return (
    <header className={`header${slim ? " header--slim" : ""}`}>
      <div className="page-container">
        <div className="header-inner">
          <Link href="/" className="logo" aria-label="Dragon Island">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ui/logo.png" alt="Dragon Island" />
          </Link>

          <nav className="nav" aria-label="Điều hướng chính">
            {NAV.map(n => (
              <Link key={n.href} href={n.href} aria-current={active === n.href ? "page" : undefined}>
                {n.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/play"
            className="btn btn-primary"
            aria-current={active === "/play" ? "page" : undefined}
          >
            Chơi ngay
          </Link>
        </div>
      </div>
    </header>
  );
}
