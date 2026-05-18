"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const GENRE_LIST = [
  { key: "ディナー",       icon: "🍽️", name: "ディナー",       desc: "夜ご飯・記念日・大人デート" },
  { key: "居酒屋",         icon: "🏮", name: "居酒屋",         desc: "飲み・カジュアルデート" },
  { key: "ランチ",         icon: "🥗", name: "ランチ",         desc: "昼デートのスタートに" },
  { key: "カフェ",         icon: "☕", name: "カフェ",         desc: "ゆったりトーク・甘い時間" },
  { key: "夜カフェ＆バー", icon: "🍸", name: "夜カフェ＆バー", desc: "シーシャ・バー・大人の夜" },
  { key: "夜景",           icon: "🌃", name: "夜景",           desc: "ロマンチックな夜スポット" },
  { key: "デートスポット", icon: "🎯", name: "デートスポット", desc: "体験・観光・アクティビティ" },
];

const DETAIL_MAP: Record<string, { icon: string; name: string; tag: string }[]> = {
  "カフェ": [
    { icon: "🥐", name: "ベーカリー",        tag: "焼きたてパン" },
    { icon: "🎨", name: "おしゃれ空間",      tag: "センス良し" },
    { icon: "🍰", name: "スイーツ系",        tag: "ケーキ・焼菓子" },
    { icon: "📸", name: "フォトジェニック",  tag: "SNS映え" },
    { icon: "☕", name: "コーヒーこだわり",  tag: "スペシャルティ" },
    { icon: "🍵", name: "抹茶・和カフェ",    tag: "和テイスト" },
    { icon: "🌿", name: "緑・テラス",        tag: "自然・開放感" },
    { icon: "🕯️", name: "落ち着き系",        tag: "静か・ゆったり" },
  ],
  "ディナー": [
    { icon: "🍝", name: "イタリアン",        tag: "パスタ・ピッツァ" },
    { icon: "🌏", name: "エスニック",        tag: "アジア・多国籍" },
    { icon: "✨", name: "高級・特別",        tag: "記念日・ハレの日" },
    { icon: "🌿", name: "緑・テラス",        tag: "自然・開放感" },
    { icon: "🎨", name: "おしゃれ空間",      tag: "センス良し" },
    { icon: "🎉", name: "記念日向け",        tag: "サプライズOK" },
    { icon: "🥩", name: "肉料理",            tag: "ステーキ・焼肉" },
    { icon: "🏙️", name: "夜景・眺望",        tag: "高層・ロマンチック" },
  ],
  "デートスポット": [
    { icon: "🎭", name: "体験・ワーク",      tag: "ものづくり" },
    { icon: "🖼️", name: "アート・美術館",    tag: "感性を磨く" },
    { icon: "🌸", name: "公園・自然散策",    tag: "散歩・ピクニック" },
    { icon: "🐠", name: "水族館・動物",      tag: "癒し系" },
    { icon: "🍵", name: "抹茶・和カフェ",    tag: "和テイスト" },
    { icon: "✨", name: "高級・特別",        tag: "記念日・ハレの日" },
    { icon: "🎬", name: "映画・エンタメ",    tag: "定番デート" },
    { icon: "🌏", name: "エスニック",        tag: "アジア・多国籍" },
  ],
  "ランチ": [
    { icon: "🍝", name: "イタリアン",        tag: "パスタ・ピッツァ" },
    { icon: "🥩", name: "肉料理",            tag: "ステーキ・焼肉" },
    { icon: "🍸", name: "カクテルバー",      tag: "大人の夜" },
    { icon: "🌏", name: "エスニック",        tag: "アジア・多国籍" },
    { icon: "🍱", name: "定食・和定食",      tag: "ごはん系" },
    { icon: "🌿", name: "緑・テラス",        tag: "自然・開放感" },
    { icon: "🍵", name: "抹茶・和カフェ",    tag: "和テイスト" },
    { icon: "✨", name: "高級・特別",        tag: "記念日・ハレの日" },
  ],
  "夜カフェ＆バー": [
    { icon: "🔮", name: "シーシャ",          tag: "水タバコ" },
    { icon: "📸", name: "フォトジェニック",  tag: "SNS映え" },
    { icon: "🍸", name: "カクテルバー",      tag: "大人の夜" },
    { icon: "🚪", name: "隠れ家",            tag: "穴場・看板なし" },
    { icon: "🌿", name: "緑・テラス",        tag: "自然・開放感" },
    { icon: "🎨", name: "おしゃれ空間",      tag: "センス良し" },
    { icon: "🍰", name: "スイーツ系",        tag: "ケーキ・焼菓子" },
    { icon: "🪴", name: "ルーフトップ",      tag: "夜風・開放感" },
  ],
  "夜景": [
    { icon: "🏙️", name: "夜景・眺望",        tag: "高層・ロマンチック" },
    { icon: "🌿", name: "緑・テラス",        tag: "自然・開放感" },
    { icon: "🌸", name: "公園・自然散策",    tag: "散歩・ピクニック" },
    { icon: "🪴", name: "ルーフトップ",      tag: "夜風・開放感" },
    { icon: "🍵", name: "抹茶・和カフェ",    tag: "和テイスト" },
    { icon: "🍸", name: "カクテルバー",      tag: "大人の夜" },
    { icon: "🐠", name: "水族館・動物",      tag: "癒し系" },
    { icon: "🚢", name: "クルーズ・水上",    tag: "非日常体験" },
  ],
  "居酒屋": [
    { icon: "🥩", name: "肉料理",            tag: "ステーキ・焼肉" },
    { icon: "🍵", name: "抹茶・和カフェ",    tag: "和テイスト" },
    { icon: "🚪", name: "隠れ家",            tag: "穴場・看板なし" },
    { icon: "🍣", name: "和食・寿司",        tag: "日本料理" },
    { icon: "🥗", name: "ヘルシー",          tag: "野菜・体に優しい" },
    { icon: "🐟", name: "海鮮",              tag: "魚介メイン" },
    { icon: "✨", name: "高級・特別",        tag: "記念日・ハレの日" },
    { icon: "🕯️", name: "落ち着き系",        tag: "静か・ゆったり" },
  ],
};

export default function HomePage() {
  const router = useRouter();
  const [step, setStep]               = useState<1 | 2>(1);
  const [selectedGenre, setGenre]     = useState<typeof GENRE_LIST[0] | null>(null);
  const [selectedDetails, setDetails] = useState<string[]>([]);

  function pickGenre(g: typeof GENRE_LIST[0]) {
    setGenre(g);
    setDetails([]);
    setStep(2);
  }

  function toggleDetail(name: string) {
    setDetails((prev) =>
      prev.includes(name) ? prev.filter((d) => d !== name) : [...prev, name]
    );
  }

  function goSearch() {
    if (!selectedGenre) return;
    const params = new URLSearchParams();
    params.set("genre", selectedGenre.key);
    if (selectedDetails.length > 0) params.set("details", selectedDetails.join(","));
    router.push("/spots?" + params.toString());
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Hero */}
      <header style={{ textAlign: "center", padding: "56px 24px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 16 }}>
          <span style={{ width: 48, height: 1, background: "var(--gold)", display: "inline-block", opacity: 0.5 }} />
          <span className="font-mincho" style={{ fontSize: 11, letterSpacing: "0.35em", color: "var(--gold)", opacity: 0.8 }}>
            miya-dateplan
          </span>
          <span style={{ width: 48, height: 1, background: "var(--gold)", display: "inline-block", opacity: 0.5 }} />
        </div>
        <h1 className="font-mincho" style={{ fontSize: "clamp(28px,5vw,44px)", fontWeight: 700, color: "var(--cream)", lineHeight: 1.3 }}>
          どこへ行こうか<br />ふたりで決める
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 10, letterSpacing: "0.12em", fontWeight: 300 }}>
          好みを選んで、最高のデートを見つけよう
        </p>
      </header>

      {/* Progress */}
      <Progress step={step} />

      {/* Screens */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px 80px" }}>

        {/* STEP 1: ジャンル選択 */}
        {step === 1 && (
          <div className="animate-fadeUp">
            <p className="font-mincho" style={{ fontSize: 18, fontWeight: 600, color: "var(--cream)", textAlign: "center", marginBottom: 6 }}>
              今日のデートは？
            </p>
            <p style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", marginBottom: 32, letterSpacing: "0.08em" }}>
              まずは大枠のカテゴリーを選んでください
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16 }}>
              {GENRE_LIST.map((g) => (
                <button key={g.key} onClick={() => pickGenre(g)}
                  style={{
                    background: "var(--card)", border: "1px solid var(--border)",
                    borderRadius: 12, padding: "28px 20px", cursor: "pointer",
                    textAlign: "center", transition: "all 0.3s ease", color: "inherit",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = "var(--gold)";
                    el.style.transform = "translateY(-3px)";
                    el.style.boxShadow = "0 12px 40px rgba(0,0,0,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = "var(--border)";
                    el.style.transform = "translateY(0)";
                    el.style.boxShadow = "none";
                  }}
                >
                  <span style={{ fontSize: 36, display: "block", marginBottom: 12 }}>{g.icon}</span>
                  <div className="font-mincho" style={{ fontSize: 16, fontWeight: 600, color: "var(--cream)", marginBottom: 5 }}>
                    {g.name}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.6 }}>{g.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: 詳細選択 */}
        {step === 2 && selectedGenre && (
          <div className="animate-fadeUp">
            <div style={{
              display: "flex", alignItems: "center", gap: 10, justifyContent: "center",
              background: "rgba(201,169,110,0.07)", border: "1px solid rgba(201,169,110,0.2)",
              borderRadius: 8, padding: "10px 16px", marginBottom: 24,
            }}>
              <span style={{ fontSize: 18 }}>{selectedGenre.icon}</span>
              <span style={{ fontSize: 12, color: "var(--gold-light)", letterSpacing: "0.06em" }}>{selectedGenre.name}</span>
              <span style={{ fontSize: 12, color: "var(--muted)", opacity: 0.6 }}>を選択中</span>
            </div>

            <p className="font-mincho" style={{ fontSize: 18, fontWeight: 600, color: "var(--cream)", textAlign: "center", marginBottom: 6 }}>
              どんなお店がいい？
            </p>
            <p style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", marginBottom: 8, letterSpacing: "0.08em" }}>
              雰囲気やスタイルを絞り込もう
            </p>
            <p style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", marginBottom: 24 }}>✦ 複数選択できます</p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12, marginBottom: 32 }}>
              {(DETAIL_MAP[selectedGenre.key] ?? []).map((d) => {
                const sel = selectedDetails.includes(d.name);
                return (
                  <button key={d.name} onClick={() => toggleDetail(d.name)}
                    style={{
                      background: sel ? "#2c2318" : "var(--card)",
                      border: sel ? "1px solid var(--gold)" : "1px solid var(--border)",
                      borderRadius: 10, padding: "20px 14px", cursor: "pointer",
                      textAlign: "center", transition: "all 0.25s ease",
                      color: "inherit", position: "relative",
                      boxShadow: sel ? "0 4px 20px rgba(0,0,0,0.4)" : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!sel) {
                        const el = e.currentTarget as HTMLElement;
                        el.style.borderColor = "rgba(201,169,110,0.4)";
                        el.style.background = "#251f16";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!sel) {
                        const el = e.currentTarget as HTMLElement;
                        el.style.borderColor = "var(--border)";
                        el.style.background = "var(--card)";
                      }
                    }}
                  >
                    {sel && (
                      <span style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "var(--gold)", borderRadius: "10px 10px 0 0" }} />
                    )}
                    <span style={{ fontSize: 26, display: "block", marginBottom: 8 }}>{d.icon}</span>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--cream)", marginBottom: 4 }}>{d.name}</div>
                    <div style={{ fontSize: 10, color: "var(--muted)" }}>{d.tag}</div>
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button onClick={() => setStep(1)}
                style={{
                  padding: "13px 32px", borderRadius: 8, fontSize: 13, letterSpacing: "0.1em",
                  cursor: "pointer", background: "transparent", color: "var(--muted)",
                  border: "1px solid var(--border)", fontWeight: 500,
                }}>
                ← 戻る
              </button>
              <button onClick={goSearch} disabled={selectedDetails.length === 0}
                style={{
                  padding: "13px 32px", borderRadius: 8, fontSize: 13, letterSpacing: "0.1em",
                  cursor: selectedDetails.length === 0 ? "not-allowed" : "pointer",
                  background: selectedDetails.length === 0 ? "var(--border)" : "var(--gold)",
                  color: selectedDetails.length === 0 ? "var(--muted)" : "#1a1200",
                  border: "none", fontWeight: 600,
                  boxShadow: selectedDetails.length > 0 ? "0 4px 20px rgba(201,169,110,0.25)" : "none",
                }}>
                スポットを探す ✦
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Progress({ step }: { step: number }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
        {[1, 2].map((s, i) => (
          <span key={s} style={{ display: "contents" }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%", display: "inline-block",
              background: step >= s ? "var(--gold)" : "var(--border)",
              opacity: step > s ? 0.45 : 1,
              transform: step === s ? "scale(1.3)" : "scale(1)",
              transition: "all 0.4s ease",
            }} />
            {i < 1 && (
              <span style={{
                width: 40, height: 1, display: "inline-block",
                background: step > s ? "var(--gold)" : "var(--border)",
                opacity: step > s ? 0.45 : 1, verticalAlign: "middle",
              }} />
            )}
          </span>
        ))}
      </div>
      <p style={{ fontSize: 12, color: "var(--muted)", letterSpacing: "0.1em" }}>
        <span style={{ color: "var(--gold)" }}>STEP {step}</span>
        {" — "}
        {step === 1 ? "ジャンルを選ぶ" : "詳細を絞り込む"}
      </p>
    </div>
  );
}