// config/planTemplates.ts
export type PlanTemplate = {
  id: string
  name: string
  steps: string[]
}

export const PLAN_TEMPLATES: PlanTemplate[] = [
  // ★追加：座組におまかせ
  { id: 'auto', name: 'おまかせ', steps: [] },

  {
    id: 'classic-5',
    name: '王道5ステップ（ランチ→体験→カフェ→ディナー→夜景）',
    steps: ['ランチ', '体験施設', 'カフェ', 'ディナー', '夜景'],
  },
  {
    id: 'light-4',
    name: '軽め4ステップ（ランチ→体験→カフェ→ディナー）',
    steps: ['ランチ', '体験施設', 'カフェ', 'ディナー'],
  },
  {
    id: 'anniversary-5',
    name: '記念日5ステップ（ランチ→体験→カフェ→ディナー→記念日用）',
    steps: ['ランチ', '体験施設', 'カフェ', 'ディナー', '記念日用'],
  },
  {
    id: 'xmas-5',
    name: '冬デート（ランチ→体験→カフェ→ディナー→クリスマスマーケット）',
    steps: ['ランチ', '体験施設', 'カフェ', 'ディナー', 'クリスマスマーケット'],
  },
]
