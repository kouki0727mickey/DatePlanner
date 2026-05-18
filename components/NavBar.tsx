"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ADMIN_EMAILS } from "@/config/admin";

function IconHome({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--gold)" : "var(--muted)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}
function IconMap({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--gold)" : "var(--muted)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C8.686 2 6 4.686 6 8c0 4.418 6 12 6 12s6-7.582 6-12c0-3.314-2.686-6-6-6z" />
      <circle cx="12" cy="8" r="2" />
    </svg>
  );
}
function IconStar({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--gold)" : "var(--muted)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" />
    </svg>
  );
}
function IconUser({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--gold)" : "var(--muted)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7" r="4" />
      <path d="M4 21c0-4 3.582-7 8-7s8 3 8 7" />
    </svg>
  );
}
function IconLogin({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--gold)" : "var(--muted)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

const links = [
  { href: "/",       label: "Top",       Icon: IconHome  },
  { href: "/spots",  label: "スポット",  Icon: IconMap   },
  { href: "/plan",   label: "プラン",    Icon: IconStar  },
  { href: "/mypage", label: "マイページ", Icon: IconUser },
  { href: "/login",  label: "ログイン",  Icon: IconLogin },
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
      {/* PC用ヘッダー（md以上） */}
      <nav className="hidden md:flex sticky top-0 z-50 items-center justify-between px-6 py-3"
        style={{ background: "rgba(14,12,10,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)" }}>
        <Link href="/" className="font-mincho text-sm tracking-widest" style={{ color: "var(--gold)" }}>
          <span style={{ opacity: 0.5 }}>—</span> miya-dateplan <span style={{ opacity: 0.5 }}>—</span>
        </Link>
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
                display: "inline-flex", alignItems: "center", gap: 4,
                background: "rgba(201,169,110,0.15)", border: "1px solid rgba(201,169,110,0.4)",
                color: "var(--gold)", fontWeight: 600,
              }}>
              <IconPlus /> 追加
            </Link>
          )}
        </div>
      </nav>

      {/* スマホ用上部バー（md未満） */}
      <nav className="flex md:hidden sticky top-0 z-50 items-center justify-between px-4 py-2"
        style={{ background: "rgba(14,12,10,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)" }}>
        <Link href="/" className="font-mincho" style={{ fontSize: 13, color: "var(--gold)", letterSpacing: "0.2em" }}>
          miya-dateplan
        </Link>
        {isAdmin && (
          <Link href="/spots/new"
            style={{
              fontSize: 11, padding: "4px 12px", borderRadius: 16, textDecoration: "none",
              display: "inline-flex", alignItems: "center", gap: 4,
              background: "rgba(201,169,110,0.15)", border: "1px solid rgba(201,169,110,0.4)",
              color: "var(--gold)", fontWeight: 600,
            }}>
            <IconPlus /> 追加
          </Link>
        )}
      </nav>

      {/* スマホ用ボトムナビ（md未満） */}
      <nav className="flex md:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{ background: "rgba(14,12,10,0.97)", backdropFilter: "blur(16px)", borderTop: "1px solid var(--border)", paddingBottom: "env(safe-area-inset-bottom)" }}>
        {links.map((l) => {
          const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
          return (
            <Link key={l.href} href={l.href}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", padding: "8px 0 6px", textDecoration: "none", gap: 3,
                position: "relative",
              }}>
              {active && (
                <span style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 24, height: 2, background: "var(--gold)", borderRadius: 2 }} />
              )}
              <l.Icon active={active} />
              <span style={{ fontSize: 9, letterSpacing: "0.03em", fontWeight: active ? 600 : 400, color: active ? "var(--gold)" : "var(--muted)" }}>
                {l.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* ボトムナビ分の余白（スマホのみ） */}
      <div className="block md:hidden" style={{ height: 60 }} />
    </>
  );
}