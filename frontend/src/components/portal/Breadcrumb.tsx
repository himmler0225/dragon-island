import Link from "next/link";

export default function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <div className="breadcrumb">
      <Link href="/">Trang chủ</Link>
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-2">
          <span className="breadcrumb-sep">›</span>
          {item.href ? (
            <Link href={item.href}>{item.label}</Link>
          ) : (
            <span style={{ color: 'var(--color-text-primary)' }}>{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}
