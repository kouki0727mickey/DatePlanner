"use client";
// app/mypage/page.tsx
// ★ Supabase auth / checkin fetch ロジックは既存コードから変更しない

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

type CheckIn = {
  id: string;
  spot_id: string;
  user_id: string;
  visited_at?: string;
  created_at?: string;
  spots?: {
    id: string;
    name: string;
    area: string;
    genre: string;
    image_url?: string;
  };
};

// テーブルによって日時フィールド名が異なるため両対応
function getDate(c: CheckIn) {
  return c.visited_at ?? c.created_at ?? "";
}

export default function MyPage() {
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [user, setUser]         = useState<{ email?: string } | null>(null);
  const [loading, setLoading]   = useState(true);

  // ── Supabase fetch ──
  useEffect(() => {
    const load = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const currentUser = userData?.user ?? null;
        setUser(currentUser);

        if (!currentUser) {
          setLoading(false);
          return;
        }

        // visits テーブルから取得（既存コードに合わせる）
        const { data, error } = await supabase
          .from("visits")
          .select("*, spots(*)")
          .eq("user_id", currentUser.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("visits fetch error:", error);
          // テーブル名が違う場合は checkins でも試みる
          const { data: data2 } = await supabase
            .from("checkins")
            .select("*, spots(*)")
            .order("visited_at", { ascending: false });
          setCheckins((data2 as CheckIn[]) ?? []);
        } else {
          setCheckins((data as CheckIn[]) ?? []);
        }
      } catch (e) {
        console.error("mypage load error:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <LoadingScreen />;

  if (!user) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <p className="font-mincho text-xl" style={{ color: "var(--cream)" }}>
        ログインが必要です
      </p>
      <Link
        href="/login"
        className="px-8 py-3 rounded-xl text-sm font-semibold tracking-widest"
        style={{ background: "var(--gold)", color: "#1a1200" }}
      >
        ログインへ
      </Link>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-10">
        <p className="font-mincho text-2xl font-semibold" style={{ color: "var(--cream)" }}>
          マイページ
        </p>
        <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>{user.email}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-10">
        <StatCard label="行ったスポット" value={checkins.length} unit="件" />
        <StatCard
          label="最近の記録"
          value={checkins[0]
            ? new Date(getDate(checkins[0])).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })
            : "—"}
          unit=""
        />
      </div>

      {/* Checkin list */}
      <p className="font-mincho text-base mb-4" style={{ color: "var(--cream)" }}>
        訪問履歴
      </p>

      {checkins.length === 0 ? (
        <div className="text-center py-16" style={{ color: "var(--muted)" }}>
          <p className="font-mincho">まだ「行った！」の記録がありません</p>
          <Link href="/spots" className="mt-4 inline-block text-xs" style={{ color: "var(--gold)" }}>
            スポット一覧へ →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {checkins.map((c, i) => (
            <CheckInRow key={c.id} checkin={c} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, unit }: { label: string; value: number | string; unit: string }) {
  return (
    <div className="rounded-xl p-5 text-center"
      style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <p className="text-xs mb-2 tracking-wider" style={{ color: "var(--muted)" }}>{label}</p>
      <p className="font-mincho text-3xl font-bold" style={{ color: "var(--gold)" }}>
        {value}<span className="text-base font-normal ml-1" style={{ color: "var(--muted)" }}>{unit}</span>
      </p>
    </div>
  );
}

function CheckInRow({ checkin, index }: { checkin: CheckIn; index: number }) {
  const spot = checkin.spots;
  return (
    <Link
      href={spot ? `/spots/${spot.id}` : "#"}
      className="flex gap-4 items-center rounded-xl p-4 transition-all duration-200 animate-fadeUp"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        animationDelay: `${Math.min(index * 0.04, 0.4)}s`,
      }}
    >
      {spot?.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={spot.image_url} alt={spot.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
      ) : (
        <div className="w-14 h-14 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: "var(--surface)" }}>💑</div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-mincho text-sm font-semibold" style={{ color: "var(--cream)" }}>
          {spot?.name ?? "不明なスポット"}
        </p>
        <div className="flex gap-2 mt-1">
          {spot?.area && (
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "rgba(201,169,110,0.1)", border: "1px solid rgba(201,169,110,0.2)", color: "var(--gold-light)" }}>
              {spot.area}
            </span>
          )}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          {getDate(checkin) ? new Date(getDate(checkin)).toLocaleDateString("ja-JP") : ""}
        </p>
      </div>
    </Link>
  );
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent mx-auto mb-4 animate-spin"
          style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }} />
        <p className="font-mincho text-sm" style={{ color: "var(--muted)" }}>読み込み中…</p>
      </div>
    </div>
  );
}