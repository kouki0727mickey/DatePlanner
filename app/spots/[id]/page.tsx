'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { ADMIN_EMAILS } from '@/config/admin'

type Spot = {
  id: string
  name: string
  area: string | null
  address: string | null
  description: string | null
  lat: number | null
  lng: number | null
  image_url: string | null
  budget: string | null
  reserve_url: string | null
  google_map_url: string | null
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

  // 管理者判定用
  const [email, setEmail] = useState<string | null>(null)

  // スポット情報取得
  useEffect(() => {
    const load = async () => {
      if (!id) {
        setError('URL の id が不正です')
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('spots')
        .select(
          'id,name,area,address,description,lat,lng,image_url,budget,reserve_url,google_map_url'
        )
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

  // ログインユーザーのメール取得（セッションがなくてもエラー扱いにしない）
  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          // セッションなし or その他のエラー → 管理者ではない扱い
          console.warn('getSession error (ignored):', error)
          setEmail(null)
          return
        }
        setEmail(data.session?.user.email ?? null)
      } catch (err) {
        // AuthSessionMissingError などもここで握る
        console.warn('getSession threw error (ignored):', err)
        setEmail(null)
      }
    }
    load()
  }, [])

  const isAdmin = !!email && ADMIN_EMAILS.includes(email)

  // 「行った！」ボタン
  const handleVisit = async () => {
    if (!spot) return
    setVisitError(null)

    try {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.error(error)
        setVisitError('ログイン情報の取得に失敗しました')
        return
      }

      const session = data.session

      if (!session?.user) {
        // ログインしていなければログインページへ
        router.push('/login')
        return
      }

      setVisitLoading(true)

      // すでに登録済みか確認
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
    } catch (err) {
      // AuthSessionMissingError などをここでキャッチ
      console.error('handleVisit getSession error:', err)
      setVisitError('ログイン情報の取得中にエラーが発生しました')
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

      {/* メインのスポットカード */}
      <section className="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-md shadow-[#00000010] space-y-4">
        {/* 画像 */}
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

        {/* タイトル + エリア */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-[#111827] sm:text-xl">
              {spot.name}
            </h2>
            {spot.area && (
              <span className="inline-flex items-center rounded-full bg-[#EFF6FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#1D4ED8]">
                {spot.area}
              </span>
            )}
          </div>
        </div>

        {/* 基本情報カード */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-xs text-[#374151] space-y-3">
          <h3 className="text-sm font-semibold text-[#111827]">基本情報</h3>
          <div className="grid grid-cols-1 gap-y-2 gap-x-6 sm:grid-cols-2">
            {spot.address && (
              <div className="flex gap-2">
                <span className="w-20 shrink-0 text-[11px] text-[#6B7280]">
                  住所
                </span>
                <span className="text-[11px] sm:text-xs">{spot.address}</span>
              </div>
            )}

            {spot.budget && (
              <div className="flex gap-2">
                <span className="w-20 shrink-0 text-[11px] text-[#6B7280]">
                  予算
                </span>
                <span className="text-[11px] sm:text-xs">{spot.budget}</span>
              </div>
            )}
          </div>

          {/* 外部リンク行 */}
          <div className="mt-2 flex flex-wrap gap-2">
            {spot.reserve_url && (
              <a
                href={spot.reserve_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full bg-[#F97316] px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm shadow-[#F97316A0] hover:bg-[#EA580C]"
              >
                予約サイトを開く
              </a>
            )}

            {spot.google_map_url && (
              <a
                href={spot.google_map_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full bg-[#2563EB] px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm shadow-[#2563EBA0] hover:bg-[#1D4ED8]"
              >
                Googleマップで開く
              </a>
            )}
          </div>
        </div>

        {/* 説明テキスト */}
        {spot.description && (
          <div className="rounded-2xl bg-[#FFF7ED] p-3 text-sm text-[#4B5563] whitespace-pre-line">
            {spot.description}
          </div>
        )}

        {/* 埋め込みマップ */}
        {mapSrc && (
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
              Location Map
            </div>
            <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#FFF7F0]">
              <iframe src={mapSrc} className="h-64 w-full" loading="lazy" />
            </div>
          </div>
        )}
      </section>

      {/* 行った！カード */}
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

      {/* 管理者だけ編集リンク */}
      {isAdmin && (
        <Link
          href={`/spots/${spot.id}/edit`}
          className="text-[11px] text-[#6B7280] underline underline-offset-4 hover:text-[#111827]"
        >
          このスポットを編集する（管理者）
        </Link>
      )}
    </div>
  )
}
