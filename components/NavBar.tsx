"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/spots", label: "スポット一覧" },
  { href: "/plan",  label: "プラン生成" },
  { href: "/mypage",label: "マイページ" },
  { href: "/login", label: "ログイン" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky top-0 z-50 flex items-center justify-between px-6 py-3"
      style={{
        background: "rgba(14,12,10,0.92)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Logo */}
      <Link href="/" className="font-mincho text-sm tracking-widest"
        style={{ color: "var(--gold)" }}>
        <span style={{ opacity: 0.5 }}>—</span>
        {" "}Top{" "}
        <span style={{ opacity: 0.5 }}>—</span>
      </Link>

      {/* Links */}
      <div className="flex gap-6">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-xs tracking-widest transition-colors duration-200"
            style={{
              color: pathname === l.href ? "var(--gold)" : "var(--muted)",
              borderBottom: pathname === l.href ? "1px solid var(--gold)" : "1px solid transparent",
              paddingBottom: "2px",
            }}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
