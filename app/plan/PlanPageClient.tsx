// app/plan/PlanPageClient.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { PLAN_TEMPLATES } from '@/config/planTemplates'
import {
  generatePlanAutoDiverse,
  generatePlanMax,
  parseGenres,
} from '@/lib/planGenerator'

type Spot = {
  id: string
  name: string
  area: string | null
  genre: string | null // カンマ区切りOK
  address: string | null
  description: string | null
  image_url: string | null
  budget: string | null
  reserve_url: string | null
  google_map_url: string | null
}

type Props = { spots: Spot[] }

export default function PlanPageClient({ spots }: Props) {
  // エリア一覧
  const areas = useMemo(() => {
    const set = new Set<string>()
    for (const s of spots) if (s.area) set.add(s.area)
    return Array.from(set).sort()
  }, [spots])

  const [selectedArea, setSelectedArea] = useState<string>(areas[0] ?? '')
  const [templateId, setTemplateId] = useState<string>('auto')
  const [plan, setPlan] = useState<any>(undefined) // undefined: 未生成 / null: 生成不能 / object: 生成結果

  // 選択エリアのスポットだけ
  const areaSpots = useMemo(
    () => spots.filter((s) => (s.area ?? '') === selectedArea),
    [spots, selectedArea]
  )

  // 表示用：このエリアにあるジャンル一覧
  const availableGenresInArea = useMemo(() => {
    const set = new Set<string>()
    for (const s of areaSpots) {
      for (const g of parseGenres(s.genre)) set.add(g)
    }
    return Array.from(set).sort()
  }, [areaSpots])

  /**
   * ✅ 重要：テンプレ選択肢を「不足が出ないものだけ」に絞る
   * - auto は常に表示
   * - auto以外は「このエリアで完全に埋まるテンプレのみ」表示
   */
  const enabledTemplates = useMemo(() => {
    const auto = PLAN_TEMPLATES.find((t) => t.id === 'auto')
    const normals = PLAN_TEMPLATES.filter((t) => t.id !== 'auto')

    const ok = normals.filter((t) => {
      if (!t.steps || t.steps.length === 0) return false

      // ここで事前評価（不足が出るテンプレは弾く）
      const result = generatePlanMax({
        allSpots: areaSpots,
        area: selectedArea,
        templateId: t.id,
        templateName: t.name,
        steps: t.steps,
      })

      // “完全に埋まる”テンプレのみ選択肢に残す
      return result.items.length >= 0 //ここを変えればリストの中に表示する条件を変更することが出来る。
    })

    // auto は先頭に、残りはテンプレ名で見やすく（好みで）
    ok.sort((a, b) => a.name.localeCompare(b.name, 'ja'))

    return auto ? [auto, ...ok] : ok
  }, [areaSpots, selectedArea])

  // 選択中テンプレが無効化されたら auto に戻す
  useEffect(() => {
    if (!enabledTemplates.some((t) => t.id === templateId)) {
      setTemplateId('auto')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledTemplates])

  const template = useMemo(
    () => enabledTemplates.find((t) => t.id === templateId) ?? enabledTemplates[0],
    [enabledTemplates, templateId]
  )

  const handleGenerate = () => {
    if (!selectedArea) return

    // auto（座組におまかせ）
    if (templateId === 'auto') {
      const result = generatePlanAutoDiverse({
        allSpots: spots,
        area: selectedArea,
        maxSteps: 5,
      })
      setPlan(result) // result が null の可能性あり
      return
    }

    if (!template) return

    // auto以外は、選択肢に残っている時点で「不足なし」のはず
    const result = generatePlanMax({
      allSpots: areaSpots,
      area: selectedArea,
      templateId: template.id,
      templateName: template.name,
      steps: template.steps,
    })
    setPlan(result)
  }

  return (
    <div className="space-y-4">
      {/* 操作エリア */}
      <div className="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-md shadow-[#00000010] space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-semibold text-[#111827]">デートプラン自動生成</h2>
          <Link
            href="/spots"
            className="text-xs text-[#6B7280] underline underline-offset-4 hover:text-[#111827]"
          >
            スポット一覧へ
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {/* エリア */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#374151]">エリア</label>
            <select
              className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
            >
              {areas.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* テンプレ（有効なものだけ） */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#374151]">デートテンプレ</label>
            <select
              className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              {enabledTemplates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={handleGenerate}
            className="inline-flex items-center justify-center rounded-full bg-[#6366F1] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-[#6366F1A0] hover:bg-[#4F46E5]"
          >
            プラン生成
          </button>
        </div>

        {/* エリア内ジャンル表示 */}
        <div className="pt-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
            このエリアに登録されているジャンル
          </div>
          <div className="mt-1 flex flex-wrap gap-2">
            {availableGenresInArea.length === 0 ? (
              <span className="text-xs text-[#6B7280]">まだジャンルが登録されていません</span>
            ) : (
              availableGenresInArea.map((g) => (
                <span
                  key={g}
                  className="rounded-full bg-[#EFF6FF] px-2 py-1 text-[11px] font-semibold text-[#1D4ED8]"
                >
                  {g}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 結果 */}
      {plan === undefined && (
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 text-sm text-[#6B7280] shadow-sm">
          まだ生成していません。エリアとテンプレを選んで「プラン生成」を押してください。
        </div>
      )}

      {plan === null && (
        <div className="rounded-2xl border border-[#FCA5A5] bg-[#FEF2F2] p-4 text-sm text-[#7F1D1D] shadow-sm">
          このエリアではプランを作れるスポットが不足しています（まずスポットを追加してください）。
        </div>
      )}

      {plan && (
        <div className="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-md shadow-[#00000010] space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-[#111827]">生成されたプラン</h3>
            <p className="text-xs text-[#6B7280]">
              {plan.area} / {plan.templateName}
            </p>
          </div>

          {/* auto の多様性版は missingGenres を出さない運用でもOK（必要ならここ非表示に） */}
          {/* {Array.isArray(plan.missingGenres) && plan.missingGenres.length > 0 && (
            <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-3 text-xs text-[#92400E]">
              参考：未使用（不足）のジャンル候補：{plan.missingGenres.join(' / ')}
            </div>
          )} */}

          <ol className="space-y-3">
            {plan.items.map((item: any) => (
              <li
                key={`${item.stepIndex}-${item.spot.id}`}
                className="rounded-2xl border border-[#E5E7EB] bg-[#FFF7F0] p-3"
              >
                <div className="text-[11px] font-semibold text-[#6B7280]">
                  Step {item.stepIndex + 1} / ジャンル：{item.matchedGenre ?? item.stepGenre}
                </div>

                <Link
                  href={`/spots/${item.spot.id}`}
                  className="text-sm font-semibold text-[#111827] underline underline-offset-4 hover:text-[#4F46E5]"
                >
                  {item.spot.name}
                </Link>

                {/* スポットのジャンル一覧 */}
                {item.spotGenres?.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {item.spotGenres.map((g: string) => (
                      <span
                        key={g}
                        className="rounded-full bg-[#EFF6FF] px-2 py-0.5 text-[10px] font-semibold text-[#1D4ED8]"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}

                {item.spot.address && (
                  <div className="mt-1 text-[11px] text-[#6B7280]">
                    {item.spot.address}
                  </div>
                )}

                <div className="mt-2 flex flex-wrap gap-2">
                  {item.spot.reserve_url && (
                    <a
                      href={item.spot.reserve_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-[#F97316] px-3 py-1 text-[11px] font-semibold text-white hover:bg-[#EA580C]"
                    >
                      予約
                    </a>
                  )}
                  {item.spot.google_map_url && (
                    <a
                      href={item.spot.google_map_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-[#2563EB] px-3 py-1 text-[11px] font-semibold text-white hover:bg-[#1D4ED8]"
                    >
                      地図
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
