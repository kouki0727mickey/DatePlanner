// lib/planGenerator.ts

export type Spot = {
  id: string
  name: string
  area: string | null
  genre: string | null // "ランチ,カフェ,記念日用" 等
  address: string | null
  description: string | null
  image_url: string | null
  budget?: string | null
  reserve_url?: string | null
  google_map_url?: string | null
}

export type GeneratedPlanItem = {
  stepIndex: number
  stepGenre: string          // 今回このステップで採用したジャンル（多様性用に割当）
  spot: Spot
  matchedGenre: string       // ★表示用：このステップで採用したジャンル（同じ意味だが明示）
  spotGenres: string[]       // ★表示用：スポットが持つ全ジャンル
}

export type GeneratedPlan = {
  area: string
  templateId: string
  templateName: string
  items: GeneratedPlanItem[]
  missingGenres: string[]
}

/** カンマ区切り（半角/全角/読点）を配列化 */
export function parseGenres(genre: string | null): string[] {
  if (!genre) return []
  return genre
    .split(/[,，、]/)
    .map((g) => g.trim())
    .filter((g) => g.length > 0)
}

/** 配列からランダムに1つ */
function pickRandom<T>(arr: T[]): T | null {
  if (arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * ★おまかせ：多様なジャンルをできるだけ含むようにプランを生成
 *
 * 1) エリア内スポットの「全ジャンル集合」を作る
 * 2) まだ使ってないジャンルを優先して、スポットを選ぶ（貪欲法）
 * 3) 可能なら preferred（王道ジャンル順）も優先
 * 4) 最大 maxSteps 件まで返す（足りない場合は作れる分だけ）
 */
export function generatePlanAutoDiverse(params: {
  allSpots: Spot[]
  area: string
  maxSteps?: number
}): GeneratedPlan | null {
  const { allSpots, area, maxSteps = 5 } = params

  const areaSpots = allSpots.filter((s) => (s.area ?? '') === area)
  if (areaSpots.length === 0) return null

  // 王道の並び（見た目がそれっぽくなる）
  const preferredOrder = [
    'ランチ',
    '体験施設',
    '遊び',
    'カフェ',
    'ディナー',
    '夜景',
    '記念日用',
    'クリスマスマーケット',
  ]

  // エリア内の全ジャンル集合
  const allGenreSet = new Set<string>()
  const spotGenresMap = new Map<string, string[]>()

  for (const s of areaSpots) {
    const gs = parseGenres(s.genre)
    spotGenresMap.set(s.id, gs)
    gs.forEach((g) => allGenreSet.add(g))
  }

  // まだ使っていないジャンル
  const unusedGenres = new Set<string>(Array.from(allGenreSet))

  const usedSpotIds = new Set<string>()
  const items: GeneratedPlanItem[] = []

  // 目標：maxSteps 件作る
  for (let i = 0; i < maxSteps; i++) {
    // まずは「未使用ジャンル」を優先して選ぶ
    // preferredOrder の中で unused に残っているジャンルを優先候補にする
    const preferredUnused = preferredOrder.filter((g) => unusedGenres.has(g))

    // 候補ジャンルの選び方：
    // 1) preferredUnused があればそこから順に試す
    // 2) なければ unusedGenres からランダムに選ぶ
    const genreCandidates: string[] =
      preferredUnused.length > 0
        ? preferredUnused
        : Array.from(unusedGenres)

    let picked: { spot: Spot; matchedGenre: string } | null = null

    // ジャンル候補を順に試して、該当スポットがあればその中からランダムに1件
    for (const g of genreCandidates) {
      const candidates = areaSpots.filter((s) => {
        if (usedSpotIds.has(s.id)) return false
        const gs = spotGenresMap.get(s.id) ?? []
        return gs.includes(g)
      })

      if (candidates.length > 0) {
        const spot = pickRandom(candidates)!
        picked = { spot, matchedGenre: g }
        break
      }
    }

    // 未使用ジャンルで取れなかった場合、残りスポットからランダムに1件（ジャンルは「おすすめ」扱い）
    if (!picked) {
      const remain = areaSpots.filter((s) => !usedSpotIds.has(s.id))
      if (remain.length === 0) break
      const spot = pickRandom(remain)!
      picked = { spot, matchedGenre: 'おすすめ' }
    }

    // 反映
    usedSpotIds.add(picked.spot.id)

    const gs = spotGenresMap.get(picked.spot.id) ?? []

    // matchedGenre を使ったら unused から消す（おすすめの場合は消さない）
    if (picked.matchedGenre !== 'おすすめ') {
      unusedGenres.delete(picked.matchedGenre)
    }

    items.push({
      stepIndex: items.length,
      stepGenre: picked.matchedGenre,
      matchedGenre: picked.matchedGenre,
      spot: picked.spot,
      spotGenres: gs,
    })

    // 全ジャンルを使い切ったら終了してもOK（ただし maxSteps まで埋めたいなら続行）
    // ここは好み：今回は「できるだけ多様に」なので、使い切っても残りをおすすめで埋める
  }

  // 不足ジャンル（今回は「おまかせ」で必ず出す仕様ではないが、情報として返す）
  // 使い切れなかった unusedGenres を不足扱いにする
  const missingGenres = Array.from(unusedGenres)

  return {
    area,
    templateId: 'auto',
    templateName: 'おまかせ',
    items,
    missingGenres,
  }
}

// lib/planGenerator.ts に追記

/**
 * 指定テンプレでも「作れる範囲で最大限作る」プラン生成
 * - 候補がないステップは missingGenres に入れてスキップ
 * - それ以外はランダムに選び items に追加（スポット重複なし）
 */
export function generatePlanMax(params: {
  allSpots: Spot[]
  area: string
  templateId: string
  templateName: string
  steps: string[]
}): GeneratedPlan {
  const { allSpots, area, templateId, templateName, steps } = params

  const areaSpots = allSpots.filter((s) => (s.area ?? '') === area)

  const used = new Set<string>()
  const items: GeneratedPlanItem[] = []
  const missingGenres: string[] = []

  steps.forEach((stepGenre, i) => {
    const candidates = areaSpots.filter((s) => {
      if (used.has(s.id)) return false
      const gs = parseGenres(s.genre)
      return gs.includes(stepGenre)
    })

    const picked = pickRandom(candidates)

    if (!picked) {
      missingGenres.push(stepGenre)
      return
    }

    used.add(picked.id)
    items.push({
      stepIndex: i,
      stepGenre,
      spot: picked,
      matchedGenre: stepGenre,
      spotGenres: parseGenres(picked.genre),
    })
  })

  return {
    area,
    templateId,
    templateName,
    items,
    missingGenres,
  }
}
