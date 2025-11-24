// app/spots/page.tsx
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

type Spot = {
  id: string
  name: string
  area: string | null
  address: string | null
  description: string | null
  image_url: string | null
}

export default async function SpotsPage() {
  const { data, error } = await supabase
    .from('spots')
    .select('id,name,area,address,description,image_url')
    .order('area', { ascending: true })
    .order('name', { ascending: true })

  const spots = (data ?? []) as Spot[]

  if (error) {
    return (
      <div className="rounded-2xl border border-[#FCA5A5] bg-[#FEE2E2] px-4 py-3 text-sm text-[#7F1D1D] shadow-md shadow-[#FCA5A580]">
        Supabase エラー: {error.message}
      </div>
    )
  }

  if (!spots.length) {
    return <p className="text-sm text-[#4B5563]">まだスポットが登録されていません。</p>
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-[#111827]">デートスポット一覧</h2>
        <p className="text-xs text-[#6B7280]">
          行ってみたい場所をタップすると、詳細や「行った！」ボタンが表示されます。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {spots.map((spot) => (
          <Link
            key={spot.id}
            href={`/spots/${spot.id}`}
            className="group flex flex-col rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-md shadow-[#00000010] transition hover:-translate-y-1 hover:border-[#6366F1] hover:shadow-lg"
          >
            {spot.image_url && (
              <div className="mb-2 overflow-hidden rounded-xl">
                {/* ここは必要なら next/image に変更してもOK */}
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
                <p className="line-clamp-2 text-xs text-[#6B7280]">{spot.address}</p>
              )}
              {spot.description && (
                <p className="line-clamp-2 text-xs text-[#9CA3AF]">{spot.description}</p>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-[#6B7280]">
              <span>タップして詳細を見る</span>
              <span className="opacity-70 group-hover:text-[#6366F1]">▶</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
