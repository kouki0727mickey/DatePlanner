"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ADMIN_EMAILS } from "@/config/admin";

const links = [
  { href: "/",       label: "Top",       icon: "🏠" },
  { href: "/spots",  label: "スポット",  icon: "🗺️" },
  { href: "/plan",   label: "プラン",    icon: "✨" },
  { href: "/mypage", label: "マイページ", icon: "💑" },
  { href: "/login",  label: "ログイン",  icon: "🔑" },
];

export default function NavBar() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user.email ?? "";
      setIsAdmin(ADMIN_EMAILS.includes(email as never));
    }).catch(() => setIsAdmin(false));
  }, []);

  return (
    <>
      {/* ── PC用ヘッダー（md以上） ── */}
      <nav className="hidden md:flex sticky top-0 z-50 items-center justify-between px-6 py-3"
        style={{ background: "rgba(14,12,10,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)" }}>
        {/* Logo */}
        <Link href="/" className="font-mincho text-sm tracking-widest" style={{ color: "var(--gold)" }}>
          <span style={{ opacity: 0.5 }}>—</span> Top <span style={{ opacity: 0.5 }}>—</span>
        </Link>
        {/* Links */}
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          {links.filter(l => l.href !== "/").map((l) => (
            <Link key={l.href} href={l.href}
              style={{
                fontSize: 12, letterSpacing: "0.1em", textDecoration: "none",
                color: pathname === l.href ? "var(--gold)" : "var(--muted)",
                borderBottom: pathname === l.href ? "1px solid var(--gold)" : "1px solid transparent",
                paddingBottom: 2,
              }}>
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <Link href="/spots/new"
              style={{
                fontSize: 11, padding: "5px 14px", borderRadius: 20, textDecoration: "none",
                background: "rgba(201,169,110,0.15)", border: "1px solid rgba(201,169,110,0.4)",
                color: "var(--gold)", fontWeight: 600,
              }}>
              ✚ 追加
            </Link>
          )}
        </div>
      </nav>

      {/* ── スマホ用上部バー（md未満） ── */}
      <nav className="flex md:hidden sticky top-0 z-50 items-center justify-between px-4 py-2"
        style={{ background: "rgba(14,12,10,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)" }}>
        <Link href="/" className="font-mincho" style={{ fontSize: 13, color: "var(--gold)", letterSpacing: "0.2em" }}>
          Rendez-vous
        </Link>
        {isAdmin && (
          <Link href="/spots/new"
            style={{
              fontSize: 11, padding: "4px 12px", borderRadius: 16, textDecoration: "none",
              background: "rgba(201,169,110,0.15)", border: "1px solid rgba(201,169,110,0.4)",
              color: "var(--gold)", fontWeight: 600,
            }}>
            ✚ 追加
          </Link>
        )}
      </nav>

      {/* ── スマホ用ボトムナビ（md未満） ── */}
      <nav className="flex md:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{ background: "rgba(14,12,10,0.97)", backdropFilter: "blur(16px)", borderTop: "1px solid var(--border)", paddingBottom: "env(safe-area-inset-bottom)" }}>
        {links.map((l) => {
          const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
          return (
            <Link key={l.href} href={l.href}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", padding: "8px 0", textDecoration: "none", gap: 2,
                color: active ? "var(--gold)" : "var(--muted)",
              }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>{l.icon}</span>
              <span style={{ fontSize: 9, letterSpacing: "0.04em", fontWeight: active ? 600 : 400 }}>
                {l.label}
              </span>
              {active && (
                <span style={{ position: "absolute", top: 0, width: 24, height: 2, background: "var(--gold)", borderRadius: 2 }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ボトムナビ分の余白（スマホのみ） */}
      <div className="block md:hidden" style={{ height: 56 }} />
    </>
  );
}