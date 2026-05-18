"use client";
// app/plan/page.tsx
// ★ Supabase fetch / プラン生成ロジックは既存コードから変更しない
//   UI のみ差し替え

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

type Spot = {
  id: string;
  name: string;
  area: string;
  genre: string;
  address: string;
  description?: string;
  image_url?: string;
};

const TEMPLATES: Record<string, string[]> = {
  "おまかせ":                              [],
  "王道5ステップ（ランチ→体験→カフェ→ディナー→夜景）": ["ランチ","デートスポット","カフェ","ディナー","夜景"],
  "記念日5ステップ（ランチ→体験→カフェ→ディナー→記念日用）":["ランチ","デートスポット","カフェ","ディナー","記念日"],
  "軽め4ステップ（ランチ→体験→カフェ→ディナー）":     ["ランチ","デートスポット","カフェ","ディナー"],
  "冬デート（ランチ→体験→カフェ→ディナー→クリスマスマーケット）":["ランチ","デートスポット","カフェ","ディナー","冬"],
};

export default function PlanPage() {
  const [spots, setSpots]       = useState<Spot[]>([]);
  const [areas, setAreas]       = useState<string[]>([]);
  const [selectedArea, setArea] = useState("");
  const [template, setTemplate] = useState("おまかせ");
  const [plan, setPlan]         = useState<Spot[]>([]);
  const [genres, setGenres]     = useState<string[]>([]);
  const [loading, setLoading]   = useState(false);

  // ── 既存のSupabase fetch ロジックをそのまま維持 ──
  useEffect(() => {
    supabase.from("spots").select("*").then(({ data }) => {
      const s = (data as Spot[]) ?? [];
      setSpots(s);
      setAreas(Array.from(new Set(s.map((x) => x.area))).sort());
    });
  }, []);

  useEffect(() => {
    if (!selectedArea) return;
    const areaSpots = spots.filter((s) => s.area === selectedArea);
    setGenres(Array.from(new Set(areaSpots.map((s) => s.genre))));
  }, [selectedArea, spots]);

  function generatePlan() {
    setLoading(true);
    const steps = TEMPLATES[template];
    const areaSpots = spots.filter((s) => s.area === selectedArea);

    let result: Spot[];
    if (steps.length === 0) {
      // おまかせ: ランダム最大5件
      result = [...areaSpots].sort(() => Math.random() - 0.5).slice(0, 5);
    } else {
      result = steps.map((genre) => {
        const candidates = areaSpots.filter((s) => s.genre === genre || s.genre.includes(genre));
        return candidates[Math.floor(Math.random() * candidates.length)];
      }).filter(Boolean) as Spot[];
    }

    setTimeout(() => { setPlan(result); setLoading(false); }, 600);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-10">
        <p className="font-mincho text-2xl font-semibold" style={{ color: "var(--cream)" }}>
          デートプラン自動生成
        </p>
        <p className="text-xs mt-2 tracking-widest" style={{ color: "var(--muted)" }}>
          エリアとテンプレを選んで一発でデートコースを作成
        </p>
      </div>

      {/* Form Card */}
      <div className="rounded-2xl p-6 mb-8"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}>

        {/* Area */}
        <FormGroup label="エリア">
          <select
            value={selectedArea}
            onChange={(e) => setArea(e.target.value)}
            className="w-full text-sm px-4 py-2.5 rounded-lg outline-none"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
          >
            <option value="">エリアを選択してください</option>
            {areas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </FormGroup>

        {/* Template */}
        <FormGroup label="デートテンプレ">
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="w-full text-sm px-4 py-2.5 rounded-lg outline-none"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
          >
            {Object.keys(TEMPLATES).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </FormGroup>

        {/* Available genres */}
        {genres.length > 0 && (
          <div className="mt-4">
            <p className="text-xs mb-2" style={{ color: "var(--muted)" }}>
              このエリアに登録されているジャンル
            </p>
            <div className="flex flex-wrap gap-2">
              {genres.map((g) => (
                <span key={g} className="text-xs px-3 py-1 rounded-full"
                  style={{ background: "rgba(201,169,110,0.1)", border: "1px solid rgba(201,169,110,0.2)", color: "var(--gold-light)" }}>
                  {g}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Button */}
        <button
          onClick={generatePlan}
          disabled={!selectedArea || loading}
          className="mt-6 w-full py-3 rounded-xl text-sm font-semibold tracking-widest transition-all duration-200"
          style={{
            background: !selectedArea || loading ? "var(--border)" : "var(--gold)",
            color: !selectedArea || loading ? "var(--muted)" : "#1a1200",
            cursor: !selectedArea || loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "生成中…" : "✦  プランを生成する  ✦"}
        </button>
      </div>

      {/* Results */}
      {plan.length > 0 && (
        <div>
          <p className="font-mincho text-lg mb-4 text-center" style={{ color: "var(--cream)" }}>
            生成されたデートプラン
          </p>
          <div className="flex flex-col gap-4">
            {plan.map((spot, i) => (
              <PlanStep key={spot.id} spot={spot} step={i + 1} />
            ))}
          </div>
        </div>
      )}

      {plan.length === 0 && !loading && (
        <div className="text-center py-12" style={{ color: "var(--muted)" }}>
          <p className="font-mincho">エリアとテンプレを選んで「プランを生成する」を押してください</p>
          <Link href="/spots" className="mt-4 inline-block text-xs"
            style={{ color: "var(--gold)" }}>
            スポット一覧を見る →
          </Link>
        </div>
      )}
    </div>
  );
}

function FormGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-xs mb-1.5 tracking-wider" style={{ color: "var(--muted)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function PlanStep({ spot, step }: { spot: Spot; step: number }) {
  return (
    <Link
      href={`/spots/${spot.id}`}
      className="flex gap-4 items-center rounded-xl p-4 transition-all duration-200 animate-fadeUp"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        animationDelay: `${step * 0.08}s`,
      }}
    >
      {/* Step number */}
      <div className="font-mincho text-2xl font-bold flex-shrink-0 w-10 text-center"
        style={{ color: step === 1 ? "var(--gold)" : "var(--border)" }}>
        {String(step).padStart(2, "0")}
      </div>

      {/* Image */}
      {spot.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={spot.image_url} alt={spot.name} className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
      ) : (
        <div className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: "var(--surface)" }}>🗺️</div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex gap-2 mb-1 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: "rgba(201,169,110,0.1)", border: "1px solid rgba(201,169,110,0.25)", color: "var(--gold-light)" }}>
            {spot.genre}
          </span>
          <span className="text-xs" style={{ color: "var(--muted)" }}>{spot.area}</span>
        </div>
        <p className="font-mincho text-sm font-semibold truncate" style={{ color: "var(--cream)" }}>
          {spot.name}
        </p>
        {spot.description && (
          <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--muted)" }}>
            {spot.description}
          </p>
        )}
      </div>

      <span className="text-xs" style={{ color: "var(--muted)" }}>→</span>
    </Link>
  );
}
