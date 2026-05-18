/**
 * scripts/generateDetailTags.ts
 * ビルド前に自動実行され、Supabaseのスポットデータから
 * 詳細タグを生成して app/page.tsx を上書きします。
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Spot = { name: string; genre: string; description?: string };
type DetailTag = { icon: string; name: string; tag: string };

const KEYWORD_DICT: (DetailTag & { keywords: string[] })[] = [
  { icon: "🚪", name: "隠れ家",           tag: "穴場・看板なし",     keywords: ["隠れ家", "穴場", "看板", "知らないと"] },
  { icon: "🏠", name: "アットホーム",     tag: "こじんまり温か",     keywords: ["アットホーム", "こじんまり", "家庭的"] },
  { icon: "✨", name: "高級・特別",       tag: "記念日・ハレの日",   keywords: ["高級", "贅沢", "記念日", "コース", "特別"] },
  { icon: "🌿", name: "緑・テラス",       tag: "自然・開放感",       keywords: ["テラス", "緑", "庭", "屋外", "ガーデン", "自然"] },
  { icon: "🏙️", name: "夜景・眺望",       tag: "高層・ロマンチック", keywords: ["夜景", "眺望", "高層", "タワー", "スカイ", "絶景", "屋上"] },
  { icon: "📸", name: "フォトジェニック", tag: "SNS映え",             keywords: ["映え", "フォト", "可愛", "インスタ", "話題"] },
  { icon: "🎨", name: "おしゃれ空間",     tag: "センス良し",         keywords: ["おしゃれ", "センス", "スタイリッシュ", "モダン", "無機質"] },
  { icon: "🕯️", name: "落ち着き系",       tag: "静か・ゆったり",    keywords: ["落ち着", "静か", "ゆったり", "くつろ", "レトロ", "古民家"] },
  { icon: "💑", name: "個室あり",         tag: "二人きり",           keywords: ["個室", "半個室", "仕切り", "プライベート"] },
  { icon: "🎉", name: "記念日向け",       tag: "サプライズOK",       keywords: ["記念日", "誕生日", "サプライズ", "お祝い"] },
  { icon: "🥩", name: "肉料理",           tag: "ステーキ・焼肉",     keywords: ["肉", "ステーキ", "焼肉", "ハンバーグ", "BBQ", "炭火", "牛"] },
  { icon: "🍣", name: "和食・寿司",       tag: "日本料理",           keywords: ["寿司", "割烹", "和食", "懐石", "日本料理", "刺身"] },
  { icon: "🍝", name: "イタリアン",       tag: "パスタ・ピッツァ",   keywords: ["イタリア", "パスタ", "ピッツァ", "ピザ", "リゾット"] },
  { icon: "🥂", name: "フレンチ",         tag: "ビストロ・洋食",     keywords: ["フレンチ", "フランス", "ビストロ", "ブラッスリー"] },
  { icon: "🌏", name: "エスニック",       tag: "アジア・多国籍",     keywords: ["エスニック", "アジア", "タイ", "インド", "メキシカン", "中華", "韓国"] },
  { icon: "🐟", name: "海鮮",             tag: "魚介メイン",         keywords: ["海鮮", "魚介", "魚", "シーフード", "牡蠣", "海老"] },
  { icon: "🍔", name: "ハンバーガー",     tag: "ガッツリ系",         keywords: ["ハンバーガー", "バーガー", "ミートサンド"] },
  { icon: "🍜", name: "ラーメン・麺",     tag: "シメにも",           keywords: ["ラーメン", "つけ麺", "麺"] },
  { icon: "🍛", name: "カレー",           tag: "スパイス系",         keywords: ["カレー", "スパイス"] },
  { icon: "🥗", name: "ヘルシー",         tag: "野菜・体に優しい",   keywords: ["ヘルシー", "野菜", "サラダ", "オーガニック"] },
  { icon: "🍱", name: "定食・和定食",     tag: "ごはん系",           keywords: ["定食", "和定食", "おひつ", "ご飯"] },
  { icon: "☕", name: "コーヒーこだわり", tag: "スペシャルティ",     keywords: ["スペシャルティ", "コーヒー", "珈琲", "焙煎", "ドリップ"] },
  { icon: "🍰", name: "スイーツ系",       tag: "ケーキ・焼菓子",     keywords: ["スイーツ", "ケーキ", "パティスリー", "焼菓子", "タルト", "プリン"] },
  { icon: "🥐", name: "ベーカリー",       tag: "焼きたてパン",       keywords: ["ベーカリー", "パン", "クロワッサン", "ドーナツ"] },
  { icon: "🧋", name: "韓国カフェ",       tag: "インスタ映え",       keywords: ["韓国", "ソウル"] },
  { icon: "🍵", name: "抹茶・和カフェ",   tag: "和テイスト",         keywords: ["抹茶", "和", "日本茶", "茶"] },
  { icon: "🥞", name: "パンケーキ",       tag: "ふわふわ系",         keywords: ["パンケーキ", "ホットケーキ", "リコッタ", "スフレ"] },
  { icon: "🍦", name: "アイス・ジェラート", tag: "冷たいスイーツ",   keywords: ["アイス", "ジェラート", "ソフトクリーム"] },
  { icon: "🔮", name: "シーシャ",         tag: "水タバコ",           keywords: ["シーシャ", "水タバコ"] },
  { icon: "🍸", name: "カクテルバー",     tag: "大人の夜",           keywords: ["カクテル", "バー", "BAR"] },
  { icon: "🎷", name: "ジャズ・音楽",     tag: "生演奏あり",         keywords: ["ジャズ", "音楽", "ライブ", "生演奏"] },
  { icon: "🍺", name: "クラフトビール",   tag: "地ビール",           keywords: ["クラフトビール", "地ビール", "ブルワリー"] },
  { icon: "🪴", name: "ルーフトップ",     tag: "夜風・開放感",       keywords: ["ルーフトップ", "屋上"] },
  { icon: "🍷", name: "ワイン",           tag: "ナチュール・自然派", keywords: ["ワイン", "ナチュール"] },
  { icon: "🖼️", name: "アート・美術館",   tag: "感性を磨く",         keywords: ["美術館", "アート", "ギャラリー", "展示", "芸術"] },
  { icon: "🐠", name: "水族館・動物",     tag: "癒し系",             keywords: ["水族館", "動物", "イルカ", "ペンギン"] },
  { icon: "🎭", name: "体験・ワーク",     tag: "ものづくり",         keywords: ["体験", "ワークショップ", "陶芸", "手作り", "工房", "リング", "香水"] },
  { icon: "🎬", name: "映画・エンタメ",   tag: "定番デート",         keywords: ["映画", "シネマ", "シアター"] },
  { icon: "🔐", name: "謎解き・脱出",     tag: "協力系",             keywords: ["謎解き", "脱出", "リアル脱出"] },
  { icon: "🌸", name: "公園・自然散策",   tag: "散歩・ピクニック",   keywords: ["公園", "散歩", "ハイキング", "自然", "池", "ボート"] },
  { icon: "🚢", name: "クルーズ・水上",   tag: "非日常体験",         keywords: ["クルーズ", "船", "水上", "川"] },
  { icon: "☀️", name: "モーニング・朝",   tag: "朝デートに",         keywords: ["モーニング", "朝", "ブランチ"] },
];

function extractTags(spots: Spot[]): DetailTag[] {
  const matchCounts = new Map<string, number>();
  for (const spot of spots) {
    const text = `${spot.name ?? ""} ${spot.description ?? ""}`;
    for (const entry of KEYWORD_DICT) {
      if (entry.keywords.some((kw) => text.includes(kw))) {
        matchCounts.set(entry.name, (matchCounts.get(entry.name) ?? 0) + 1);
      }
    }
  }
  return KEYWORD_DICT
    .filter((e) => (matchCounts.get(e.name) ?? 0) >= 1)
    .sort((a, b) => (matchCounts.get(b.name) ?? 0) - (matchCounts.get(a.name) ?? 0))
    .slice(0, 8)
    .map(({ icon, name, tag }) => ({ icon, name, tag }));
}

async function main() {
  console.log("📦 Supabaseからスポットデータを取得中...");

  const { data: spots, error } = await supabase
    .from("spots")
    .select("name, genre, description");

  if (error || !spots) {
    console.error("Supabase取得エラー:", error);
    process.exit(1);
  }

  // ジャンルをカンマ区切りで展開
  const genreSet = new Set<string>();
  for (const spot of spots as Spot[]) {
    (spot.genre ?? "").split(",").map((g) => g.trim()).filter(Boolean).forEach((g) => genreSet.add(g));
  }

  const genres = Array.from(genreSet).sort();
  console.log(`✅ ジャンル検出: ${genres.join(", ")}`);

  const detailMap: Record<string, DetailTag[]> = {};
  for (const genre of genres) {
    const genreSpots = (spots as Spot[]).filter((s) =>
      (s.genre ?? "").split(",").map((g) => g.trim()).includes(genre)
    );
    detailMap[genre] = extractTags(genreSpots);
    console.log(`  [${genre}] ${detailMap[genre].map((t) => t.name).join(", ")}`);
  }

  // DETAIL_MAP のコードを生成
  const lines: string[] = [
    "const DETAIL_MAP: Record<string, { icon: string; name: string; tag: string }[]> = {",
  ];
  for (const [genre, tags] of Object.entries(detailMap)) {
    lines.push(`  "${genre}": [`);
    for (const t of tags) {
      lines.push(`    { icon: "${t.icon}", name: "${t.name}", tag: "${t.tag}" },`);
    }
    lines.push(`  ],`);
  }
  lines.push("};");
  const newDetailMap = lines.join("\n");

  // app/page.tsx を読み込んで DETAIL_MAP 部分だけ置き換える
  const pagePath = path.join(process.cwd(), "app", "page.tsx");
  const pageContent = fs.readFileSync(pagePath, "utf-8");

  const replaced = pageContent.replace(
    /const DETAIL_MAP: Record<string, \{ icon: string; name: string; tag: string \}\[\]> = \{[\s\S]*?\};/,
    newDetailMap
  );

  if (replaced === pageContent) {
    console.warn("⚠️  DETAIL_MAP が page.tsx 内に見つかりませんでした。スキップします。");
    process.exit(0);
  }

  fs.writeFileSync(pagePath, replaced, "utf-8");
  console.log("✅ app/page.tsx の DETAIL_MAP を更新しました！");
}

main().catch((e) => { console.error(e); process.exit(1); });