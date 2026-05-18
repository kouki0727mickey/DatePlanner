"use client";
// app/login/page.tsx
// ★ Supabase Google OAuth ロジックは既存コードから変更しない

import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // ── 既存のセッションチェックをそのまま維持 ──
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) router.replace("/mypage");
      else setChecking(false);
    });
  }, [router]);

  async function handleGoogleLogin() {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/mypage` },
    });
  }

  if (checking) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 rounded-full border-2 animate-spin mx-auto"
        style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }} />
    </div>
  );

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-sm">
        {/* Logo area */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span style={{ width: 40, height: 1, background: "var(--gold)", display: "inline-block", opacity: 0.5 }} />
            <span className="font-mincho text-xs tracking-widest" style={{ color: "var(--gold)", opacity: 0.8 }}>
              SIGN IN
            </span>
            <span style={{ width: 40, height: 1, background: "var(--gold)", display: "inline-block", opacity: 0.5 }} />
          </div>
          <h1 className="font-mincho text-2xl font-semibold" style={{ color: "var(--cream)" }}>
            ログイン
          </h1>
          <p className="text-xs mt-2 tracking-wide" style={{ color: "var(--muted)" }}>
            Google アカウントでかんたんにはじめられます
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-sm font-semibold tracking-wider transition-all duration-200"
            style={{
              background: loading ? "var(--border)" : "var(--gold)",
              color: loading ? "var(--muted)" : "#1a1200",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? (
              <span>ログイン中…</span>
            ) : (
              <>
                <GoogleIcon />
                Google でログイン
              </>
            )}
          </button>

          <p className="text-center text-xs mt-6 leading-relaxed" style={{ color: "var(--muted)" }}>
            ログインすることで、「行った！」記録や<br />デートプランの保存が使えるようになります
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#1a1200" fillOpacity="0.8"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#1a1200" fillOpacity="0.7"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#1a1200" fillOpacity="0.6"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#1a1200" fillOpacity="0.5"/>
    </svg>
  );
}
