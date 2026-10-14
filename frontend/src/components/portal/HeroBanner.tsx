import Link from "next/link";

export default function HeroBanner() {
  return (
    <div className="relative h-72 rounded-xl overflow-hidden mb-10" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f172a 100%)' }}>
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative h-full flex items-center">
        <div className="page-container w-full">
          <div className="flex items-center justify-between">
            <div className="max-w-xl">
              <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                Dragon Island
              </h1>
              <p className="text-lg mb-6" style={{ color: 'var(--color-text-secondary)' }}>
                Khám phá đảo nổi kỳ diệu, nuôi dưỡng và chiến đấu cùng rồng
              </p>
              <Link href="/play" className="btn btn-primary btn-lg">
                Chơi ngay →
              </Link>
            </div>
            <div className="text-9xl opacity-30 hidden md:block">🐉</div>
          </div>
        </div>
      </div>
    </div>
  );
}
