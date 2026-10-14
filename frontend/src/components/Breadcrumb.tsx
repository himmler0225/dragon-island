export default function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <div className="breadcrumb">
      <a href="/">Trang chủ</a>
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-2">
          <span className="breadcrumb-sep">›</span>
          {item.href ? (
            <a href={item.href}>{item.label}</a>
          ) : (
            <span style={{ color: 'var(--color-text-primary)' }}>{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}
