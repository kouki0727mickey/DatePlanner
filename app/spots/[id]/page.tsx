// app/spots/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type Spot = {
  id: string
  name: string
  area: string | null
  address: string | null
  description: string | null
  lat: number | null
  lng: number | null
  image_url: string | null
}

export default function SpotDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params?.id

  const [spot, setSpot] = useState<Spot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isVisited, setIsVisited] = useState(false)
  const [visitLoading, setVisitLoading] = useState(false)
  const [visitError, setVisitError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setError('URL の id が不正です')
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('spots')
        .select('id,name,area,address,description,lat,lng,image_url')
        .eq('id', id)
        .maybeSingle()

      if (error) {
        console.error(error)
        setError(error.message)
      } else if (!data) {
        setError('スポットが見つかりませんでした')
      } else {
        setSpot(data as Spot)
      }
      setLoading(false)
    }

    load()
  }, [id])

  const handleVisit = async () => {
    if (!spot) return
    setVisitError(null)

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error) {
      console.error(error)
      setVisitError('ログイン情報の取得に失敗しました')
      return
    }

    if (!session?.user) {
      // 未ログインなら login へ
      router.push('/login')
      return
    }

    setVisitLoading(true)

    try {
      // すでに登録済みか確認（ユーザー単位）
      const { data: existing, error: existingErr } = await supabase
        .from('visits')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('spot_id', spot.id)
        .limit(1)

      if (existingErr) {
        console.error(existingErr)
        setVisitError('履歴確認に失敗しました')
        setVisitLoading(false)
        return
      }

      if (existing && existing.length > 0) {
        setIsVisited(true)
        setVisitLoading(false)
        return
      }

      const { error: insertErr } = await supabase.from('visits').insert({
        user_id: session.user.id,
        spot_id: spot.id,
      })

      if (insertErr) {
        console.error(insertErr)
        setVisitError('「行った！」の登録に失敗しました')
        setVisitLoading(false)
        return
      }

      setIsVisited(true)
      setVisitLoading(false)
    } catch (e) {
      console.error(e)
      setVisitError('予期せぬエラーが発生しました')
      setVisitLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#374151] shadow-md shadow-[#00000010]">
        スポット情報を読み込み中…
      </div>
    )
  }

  if (!spot || error) {
    return (
      <div className="space-y-3">
        <Link
          href="/spots"
          className="text-xs text-[#6B7280] underline underline-offset-4 hover:text-[#111827]"
        >
          ← スポット一覧にもどる
        </Link>
        <div className="rounded-2xl border border-[#FCA5A5] bg-[#FEE2E2] px-4 py-3 text-sm text-[#7F1D1D] shadow-md shadow-[#FCA5A580]">
          {error ?? 'スポット情報が取得できませんでした。'}
        </div>
      </div>
    )
  }

  const mapSrc =
    spot.lat && spot.lng
      ? `https://www.google.com/maps?q=${spot.lat},${spot.lng}&z=17&output=embed`
      : null

  return (
    <div className="space-y-4">
      <Link
        href="/spots"
        className="text-xs text-[#6B7280] underline underline-offset-4 hover:text-[#111827]"
      >
        ← スポット一覧にもどる
      </Link>

      <section className="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-md shadow-[#00000010] space-y-3">
        {spot.image_url && (
          <div className="overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={spot.image_url}
              alt={spot.name}
              className="max-h-72 w-full object-cover"
            />
          </div>
        )}

        <div>
          <h2 className="mb-1 text-xl font-semibold text-[#111827]">
            {spot.name}
          </h2>
          {spot.area && (
            <p className="text-xs text-[#6B7280]">エリア：{spot.area}</p>
          )}
          {spot.address && (
            <p className="text-xs text-[#6B7280]">住所：{spot.address}</p>
          )}
        </div>

        {spot.description && (
          <p className="text-sm text-[#4B5563] whitespace-pre-line">
            {spot.description}
          </p>
        )}

        {mapSrc && (
          <div className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
            場所（Google マップ）
          </div>
        )}
        {mapSrc && (
          <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#FFF7F0]">
            <iframe src={mapSrc} className="h-64 w-full" loading="lazy" />
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-[#BBF7D0] bg-[#ECFDF3] p-4 shadow-md shadow-[#22C55E40] space-y-2">
        <h3 className="text-sm font-semibold text-[#166534]">
          このスポットにデートで行った？
        </h3>
        <p className="text-xs text-[#374151]">
          行ったら「行った！」ボタンを押して、二人の思い出として残しておこう。
        </p>

        <button
          type="button"
          onClick={handleVisit}
          disabled={visitLoading || isVisited}
          className="mt-1 inline-flex items-center justify-center rounded-full bg-[#22C55E] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-[#22C55E80] transition hover:bg-[#16A34A] disabled:opacity-60 disabled:shadow-none"
        >
          {isVisited ? '行った！登録済み' : visitLoading ? '登録中…' : '行った！'}
        </button>

        {visitError && (
          <p className="text-xs text-[#B91C1C]">{visitError}</p>
        )}
      </section>
    </div>
  )
}
