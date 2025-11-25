// app/spots/SpotsPageClient.tsx
'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

type Spot = {
  id: string
  name: string
  area: string | null
  address: string | null
  description: string | null
  image_url: string | null
}

type Props = {
  spots: Spot[]
}

export default function SpotsPageClient({ spots }: Props) {
  const [selectedArea, setSelectedArea] = useState<string>('')

  // プルダウンに表示するエリア一覧（ユニーク＆ソート）
  const areas = useMemo(() => {
    const set = new Set<string>()
    for (const s of spots) {
      if (s.area) set.add(s.area)
    }
    return Array.from(set).sort()
  }, [spots])

  // フィルタ後のスポット一覧
  const filteredSpots = useMemo(
    () =>
      selectedArea
        ? spots.filter((s) => s.area === selectedArea)
        : spots,
    [spots, selectedArea]
  )

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-[#111827]">
          デートスポット一覧
        </h2>
        <p className="text-xs text-[#6B7280]">
          行ってみたい場所をタップすると、詳細や「行った！」ボタンが表示されます。
        </p>

        {/* エリアフィルタ（プルダウン） */}
        <div className="mt-3 flex items-center gap-2">
          <label className="text-[11px] text-[#6B7280]">
            エリアで絞り込み
          </label>
          <select
            className="flex-1 rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs text-[#374151] shadow-sm focus:border-[#6366F1] focus:outline-none"
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
          >
            <option value="">すべてのエリア</option>
            {areas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredSpots.length === 0 ? (
        <p className="text-sm text-[#4B5563]">
          {selectedArea
            ? `「${selectedArea}」エリアのスポットはまだ登録されていません。`
            : 'まだスポットが登録されていません。'}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredSpots.map((spot) => (
            <Link
              key={spot.id}
              href={`/spots/${spot.id}`}
              className="group flex flex-col rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-md shadow-[#00000010] transition hover:-translate-y-1 hover:border-[#6366F1] hover:shadow-lg"
            >
              {spot.image_url && (
                <div className="mb-2 overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={spot.image_url}
                    alt={spot.name}
                    className="h-32 w-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
              )}
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="line-clamp-1 text-sm font-semibold text-[#111827]">
                    {spot.name}
                  </h3>
                  {spot.area && (
                    <span className="rounded-full bg-[#E0F2FE] px-2 py-0.5 text-[10px] font-semibold text-[#1D4ED8]">
                      {spot.area}
                    </span>
                  )}
                </div>
                {spot.address && (
                  <p className="line-clamp-2 text-xs text-[#6B7280]">
                    {spot.address}
                  </p>
                )}
                {spot.description && (
                  <p className="line-clamp-2 text-xs text-[#9CA3AF]">
                    {spot.description}
                  </p>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-[#6B7280]">
                <span>タップして詳細を見る</span>
                <span className="opacity-70 group-hover:text-[#6366F1]">
                  ▶
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
