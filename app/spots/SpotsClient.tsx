"use client";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ADMIN_EMAILS } from "@/config/admin";
import type { Spot } from "./page";

// 詳細タグ → 検索キーワードのマッピング
const TAG_KEYWORDS: Record<string, string[]> = {
  "ベーカリー":        ["ベーカリー", "パン", "クロワッサン", "ドーナツ"],
  "おしゃれ空間":      ["おしゃれ", "センス", "スタイリッシュ", "モダン", "無機質"],
  "スイーツ系":        ["スイーツ", "ケーキ", "パティスリー", "焼菓子", "タルト", "プリン"],
  "フォトジェニック":  ["映え", "フォト", "可愛", "インスタ", "話題"],
  "コーヒーこだわり":  ["スペシャルティ", "コーヒー", "珈琲", "焙煎", "ドリップ"],
  "抹茶・和カフェ":    ["抹茶", "和", "日本茶", "茶"],
  "緑・テラス":        ["テラス", "緑", "庭", "屋外", "ガーデン", "自然"],
  "落ち着き系":        ["落ち着", "静か", "ゆったり", "くつろ", "レトロ", "古民家"],
  "イタリアン":        ["イタリア", "パスタ", "ピッツァ", "ピザ", "リゾット"],
  "エスニック":        ["エスニック", "アジア", "タイ", "インド", "メキシカン", "中華", "韓国"],
  "高級・特別":        ["高級", "贅沢", "記念日", "コース", "特別"],
  "記念日向け":        ["記念日", "誕生日", "サプライズ", "お祝い"],
  "肉料理":            ["肉", "ステーキ", "焼肉", "ハンバーグ", "BBQ", "炭火", "牛"],
  "夜景・眺望":        ["夜景", "眺望", "高層", "タワー", "スカイ", "絶景", "屋上"],
  "体験・ワーク":      ["体験", "ワークショップ", "陶芸", "手作り", "工房", "リング", "香水"],
  "アート・美術館":    ["美術館", "アート", "ギャラリー", "展示", "芸術"],
  "公園・自然散策":    ["公園", "散歩", "ハイキング", "自然", "池", "ボート"],
  "水族館・動物":      ["水族館", "動物", "イルカ", "ペンギン"],
  "映画・エンタメ":    ["映画", "シネマ", "シアター"],
  "定食・和定食":      ["定食", "和定食", "おひつ", "ご飯"],
  "シーシャ":          ["シーシャ", "水タバコ"],
  "カクテルバー":      ["カクテル", "バー", "BAR"],
  "隠れ家":            ["隠れ家", "穴場", "看板", "知らないと"],
  "ルーフトップ":      ["ルーフトップ", "屋上"],
  "クルーズ・水上":    ["クルーズ", "船", "水上", "川"],
  "和食・寿司":        ["寿司", "割烹", "和食", "懐石", "日本料理"],
  "ヘルシー":          ["ヘルシー", "野菜", "サラダ", "オーガニック"],
  "海鮮":              ["海鮮", "魚介", "魚", "シーフード"],
};

export default function SpotsClient({ spots }: { spots: Spot[] }) {
  const searchParams = useSearchParams();

  const areas  = useMemo(() => {
    const all = spots.flatMap((s) => (s.area ?? "").split(",").map((a) => a.trim()).filter(Boolean));
    return ["すべてのエリア", ...Array.from(new Set(all))];
  }, [spots]);
  const genres = useMemo(() => {
    const all = spots.flatMap((s) => (s.genre ?? "").split(",").map((g) => g.trim()).filter(Boolean));
    return ["すべてのジャンル", ...Array.from(new Set(all))];
  }, [spots]);

  const [area,    setArea]    = useState("すべてのエリア");
  const [genre,   setGenre]   = useState("すべてのジャンル");
  const [details, setDetails] = useState<string[]>([]);
  const [query,   setQuery]   = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  // 管理者チェック
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user.email ?? "";
      setIsAdmin(ADMIN_EMAILS.includes(email as never));
    }).catch(() => setIsAdmin(false));
  }, []);

  // トップページから遷移してきた場合はURLパラメータを反映
  useEffect(() => {
    const g = searchParams.get("genre");
    const d = searchParams.get("details");
    if (g) setGenre(g);
    if (d) setDetails(d.split(",").filter(Boolean));
  }, [searchParams]);

  const filtered = useMemo(() =>
    spots.filter((s) => {
      const spotGenres = (s.genre ?? "").split(",").map((g) => g.trim());
      // エリアもカンマ区切りに対応
      const spotAreas  = (s.area  ?? "").split(",").map((a) => a.trim());
      const text = `${s.name ?? ""} ${s.description ?? ""}`;

      const areaMatch  = area  === "すべてのエリア"   || spotAreas.includes(area);
      const genreMatch = genre === "すべてのジャンル" || spotGenres.includes(genre);
      const detailMatch = details.length === 0 || details.some((tag) => {
        const keywords = TAG_KEYWORDS[tag] ?? [tag];
        return keywords.some((kw) => text.includes(kw));
      });
      const queryMatch = query === "" || (s.name ?? "").includes(query) || (s.description ?? "").includes(query);

      return areaMatch && genreMatch && detailMatch && queryMatch;
    }),
    [spots, area, genre, details, query]
  );

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px 80px" }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40, flexWrap: "wrap", gap: 12 }}>
        <div>
          <p className="font-mincho" style={{ fontSize: 22, fontWeight: 600, color: "var(--cream)" }}>
            デートスポット一覧
          </p>
          <p style={{ fontSize: 12, marginTop: 6, letterSpacing: "0.1em", color: "var(--muted)" }}>
            行ってみたい場所をタップすると詳細が見られます
          </p>
        </div>
        {isAdmin && (
          <Link href="/spots/new"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "10px 20px", borderRadius: 12, textDecoration: "none",
              background: "var(--gold)", color: "#1a1200",
              fontSize: 13, fontWeight: 600, letterSpacing: "0.06em",
              boxShadow: "0 4px 16px rgba(201,169,110,0.25)",
              transition: "all 0.2s",
              flexShrink: 0,
            }}>
            ✚ スポットを追加
          </Link>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16, alignItems: "flex-end" }}>
        <input
          type="text"
          placeholder="スポット名で検索…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            flex: 1, minWidth: 180, fontSize: 13, padding: "8px 16px",
            borderRadius: 8, outline: "none",
            background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)",
          }}
        />
        <SelectFilter label="エリア"   options={areas}  value={area}  onChange={setArea} />
        <SelectFilter label="ジャンル" options={genres} value={genre} onChange={setGenre} />
      </div>

      {/* 選択中の詳細タグ */}
      {details.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>絞り込み中：</span>
          {details.map((d) => (
            <span key={d}
              style={{
                fontSize: 11, padding: "3px 12px", borderRadius: 20, cursor: "pointer",
                background: "rgba(201,169,110,0.15)", border: "1px solid var(--gold)",
                color: "var(--gold-light)", display: "flex", alignItems: "center", gap: 4,
              }}
              onClick={() => setDetails((prev) => prev.filter((t) => t !== d))}
            >
              {d} ✕
            </span>
          ))}
          <button
            onClick={() => setDetails([])}
            style={{ fontSize: 11, color: "var(--muted)", background: "none", border: "none", cursor: "pointer" }}
          >
            すべてクリア
          </button>
        </div>
      )}

      {/* Count */}
      <p style={{ fontSize: 12, marginBottom: 20, color: "var(--muted)" }}>
        {filtered.length} 件のスポット
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--muted)" }}>
          <p className="font-mincho" style={{ fontSize: 18 }}>該当するスポットがありません</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
          {filtered.map((spot, i) => (
            <SpotCard key={spot.id} spot={spot} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function SelectFilter({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, color: "var(--muted)" }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{
          fontSize: 13, padding: "8px 12px", borderRadius: 8, outline: "none", cursor: "pointer",
          background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)",
        }}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function SpotCard({ spot, index }: { spot: Spot; index: number }) {
  // カンマ区切りを個別タグに分割
  const areas  = (spot.area  ?? "").split(",").map(s => s.trim()).filter(Boolean);
  const genres = (spot.genre ?? "").split(",").map(s => s.trim()).filter(Boolean);

  return (
    <Link href={`/spots/${spot.id}`}
      className="animate-fadeUp"
      style={{
        display: "block", borderRadius: 12, overflow: "hidden",
        background: "var(--card)", border: "1px solid var(--border)",
        textDecoration: "none", transition: "all 0.25s ease",
        animationDelay: `${Math.min(index * 0.04, 0.5)}s`,
        color: "inherit",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(201,169,110,0.4)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
      }}
    >
      {spot.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={spot.image_url} alt={spot.name} style={{ width: "100%", height: 140, objectFit: "cover" }} />
      ) : (
        <div style={{ width: "100%", height: 100, background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>
          🗺️
        </div>
      )}
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
          {areas.map(a  => <AreaTag  key={a}>{a}</AreaTag>)}
          {genres.map(g => <GenreTag key={g}>{g}</GenreTag>)}
        </div>
        <p className="font-mincho" style={{ fontSize: 14, fontWeight: 600, color: "var(--cream)", marginBottom: 4 }}>
          {spot.name}
        </p>
        <p style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {spot.address}
        </p>
        {spot.description && (
          <p style={{ fontSize: 11, color: "var(--text)", opacity: 0.7, marginTop: 6, lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {spot.description}
          </p>
        )}
        <p style={{ fontSize: 11, marginTop: 10, textAlign: "right", color: "var(--gold)", opacity: 0.8 }}>
          タップして詳細を見る →
        </p>
      </div>
    </Link>
  );
}

function AreaTag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 10, padding: "2px 10px", borderRadius: 20,
      background: "rgba(201,169,110,0.12)", border: "1px solid rgba(201,169,110,0.3)",
      color: "var(--gold-light)",
    }}>
      📍 {children}
    </span>
  );
}

function GenreTag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 10, padding: "2px 10px", borderRadius: 20,
      background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
      color: "var(--muted)",
    }}>
      {children}
    </span>
  );
}