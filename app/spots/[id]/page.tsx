'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { ADMIN_EMAILS } from '@/config/admin'

/**
 * spots テーブル型（代表画像は image_url）
 */
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
  instagram_url: string | null
}

/**
 * spot_images テーブル型（複数画像）
 */
type SpotImage = {
  id: string
  image_url: string
  sort_order: number
}

export default function SpotDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params?.id

  const [spot, setSpot] = useState<Spot | null>(null)
  const [images, setImages] = useState<SpotImage[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 管理者判定用
  const [email, setEmail] = useState<string | null>(null)
  const isAdmin = !!email && ADMIN_EMAILS.includes(email)

  // 「行った！」機能（既存機能がある場合はここを既存に合わせてOK）
  const [isVisited, setIsVisited] = useState(false)
  const [visitLoading, setVisitLoading] = useState(false)
  const [visitError, setVisitError] = useState<string | null>(null)

  // モーダル制御
  const [modalOpen, setModalOpen] = useState(false)
  const [modalIndex, setModalIndex] = useState(0)

  // スワイプ制御（タッチ開始座標など）
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const touchLock = useRef(false) // 1スワイプで連続切替しないようロック

  /**
   * ①スポット情報 + ②ギャラリー画像を取得
   */
  useEffect(() => {
    const load = async () => {
      if (!id) {
        setError('URL の id が不正です')
        setLoading(false)
        return
      }

      try {
        // --- spots 本体取得 ---
        const { data: spotData, error: spotErr } = await supabase
          .from('spots')
          .select(
            'id,name,area,address,description,lat,lng,image_url,budget,reserve_url,google_map_url,instagram_url'
          )
          .eq('id', id)
          .maybeSingle()

        if (spotErr) {
          console.error(spotErr)
          setError(spotErr.message)
          setLoading(false)
          return
        }

        if (!spotData) {
          setError('スポットが見つかりませんでした')
          setLoading(false)
          return
        }

        setSpot(spotData as Spot)

        // --- spot_images 取得（sort_order順） ---
        const { data: imgData, error: imgErr } = await supabase
          .from('spot_images')
          .select('id,image_url,sort_order')
          .eq('spot_id', id)
          .order('sort_order', { ascending: true })

        if (imgErr) {
          console.warn('spot_images 取得エラー:', imgErr)
          setImages([])
        } else {
          setImages((imgData ?? []) as SpotImage[])
        }

        setLoading(false)
      } catch (e) {
        console.error(e)
        setError('読み込み中にエラーが発生しました')
        setLoading(false)
      }
    }

    load()
  }, [id])

  /**
   * セッションからメール取得（管理者判定）
   * ※セッション無しでも落ちないように try/catch
   */
  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.warn('getSession error:', error)
          setEmail(null)
          return
        }
        setEmail(data.session?.user.email ?? null)
      } catch (e) {
        console.warn('getSession threw:', e)
        setEmail(null)
      }
    }
    load()
  }, [])

  /**
   * 代表画像（カバー）決定：
   * - spots.image_url があればそれ
   * - 無ければギャラリー先頭を代表として表示
   */
  const coverUrl = useMemo(() => {
    if (spot?.image_url) return spot.image_url
    return images.length ? images[0].image_url : null
  }, [spot?.image_url, images])

  /**
   * モーダル用の全画像配列：
   * - cover + images を重複なしで構成
   */
  const allImages = useMemo(() => {
    const list: string[] = []
    if (coverUrl) list.push(coverUrl)
    for (const img of images) {
      if (!list.includes(img.image_url)) list.push(img.image_url)
    }
    return list
  }, [coverUrl, images])

  /**
   * モーダルを開く
   */
  const openModalAt = (index: number) => {
    setModalIndex(index)
    setModalOpen(true)
    touchLock.current = false
  }

  /**
   * モーダルを閉じる
   */
  const closeModal = () => {
    setModalOpen(false)
    touchStartX.current = null
    touchStartY.current = null
    touchLock.current = false
  }

  /**
   * キーボード操作（PC向け）
   * - ESC: 閉じる
   * - ← →: 切替
   */
  useEffect(() => {
    if (!modalOpen) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
      if (e.key === 'ArrowLeft') setModalIndex((i) => Math.max(0, i - 1))
      if (e.key === 'ArrowRight')
        setModalIndex((i) => Math.min(allImages.length - 1, i + 1))
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [modalOpen, allImages.length])

  /**
   * スワイプ開始（モーダル用）
   */
  const onTouchStart = (e: React.TouchEvent) => {
    if (!e.touches?.length) return
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    touchLock.current = false
  }

  /**
   * スワイプ移動（モーダル用）
   * - 横方向が一定以上動いたら画像切替
   * - 縦スクロールの誤判定を避けるため、縦移動が大きい場合は無視
   */
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchLock.current) return
    if (touchStartX.current == null || touchStartY.current == null) return
    if (!e.touches?.length) return

    const x = e.touches[0].clientX
    const y = e.touches[0].clientY

    const dx = x - touchStartX.current
    const dy = y - touchStartY.current

    // 縦移動が大きい場合はスクロールとみなしてスワイプ判定しない
    if (Math.abs(dy) > 40) return

    // スワイプ閾値（これ以上で切替）
    const threshold = 60

    if (dx > threshold) {
      // 右スワイプ：前へ
      touchLock.current = true
      setModalIndex((i) => Math.max(0, i - 1))
    } else if (dx < -threshold) {
      // 左スワイプ：次へ
      touchLock.current = true
      setModalIndex((i) => Math.min(allImages.length - 1, i + 1))
    }
  }

  /**
   * スワイプ終了（モーダル用）
   */
  const onTouchEnd = () => {
    touchStartX.current = null
    touchStartY.current = null
    // ちょっと遅延してロック解除（連続切替防止）
    setTimeout(() => {
      touchLock.current = false
    }, 120)
  }

  /**
   * 「行った！」ボタン処理（あなたの既存 visits テーブルに合わせた版）
   */
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
        router.push('/login')
        return
      }

      setVisitLoading(true)

      // 既存チェック
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
      setVisitError('ログイン情報の取得中にエラーが発生しました')
      setVisitLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#374151] shadow">
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
        <div className="rounded-2xl border border-[#FCA5A5] bg-[#FEE2E2] px-4 py-3 text-sm text-[#7F1D1D] shadow">
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
    <div className="mx-auto w-full max-w-2xl space-y-4 px-3 pb-10 sm:px-0">
      {/* 戻る */}
      <Link
        href="/spots"
        className="text-xs text-[#6B7280] underline underline-offset-4 hover:text-[#111827]"
      >
        ← スポット一覧にもどる
      </Link>

      {/* メインカード（スマホで見やすい縦構成） */}
      <section className="space-y-4 rounded-3xl border border-[#E5E7EB] bg-white p-3 shadow-md shadow-[#00000010] sm:p-4">
        {/* 代表画像（タップで拡大） */}
        {coverUrl && (
          <button
            type="button"
            onClick={() => openModalAt(0)}
            className="block w-full overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] focus:outline-none"
            aria-label="画像を拡大"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverUrl}
              alt={spot.name}
              className="h-56 w-full object-cover sm:h-72"
            />
          </button>
        )}

        {/* タイトル・エリア */}
        <div className="space-y-2">
          <h1 className="text-lg font-semibold text-[#111827] sm:text-xl">
            {spot.name}
          </h1>

          <div className="flex flex-wrap items-center gap-2">
            {spot.area && (
              <span className="inline-flex items-center rounded-full bg-[#EFF6FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#1D4ED8]">
                {spot.area}
              </span>
            )}
            {spot.budget && (
              <span className="inline-flex items-center rounded-full bg-[#ECFDF3] px-2.5 py-0.5 text-[11px] font-semibold text-[#166534]">
                {spot.budget}
              </span>
            )}
          </div>
        </div>

        {/* ギャラリー（スマホは横スクロールで見やすく） */}
        {allImages.length > 1 && (
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
              Gallery
            </div>

            <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-2 sm:overflow-visible sm:px-0">
              {allImages.map((url, idx) => (
                <button
                  key={url + idx}
                  type="button"
                  onClick={() => openModalAt(idx)}
                  className="shrink-0 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white focus:outline-none sm:shrink"
                  aria-label={`画像を拡大 ${idx + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="h-24 w-40 object-cover sm:h-28 sm:w-full"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 基本情報（見やすくブロック化） */}
        {(spot.address || spot.reserve_url || spot.google_map_url || spot.instagram_url) && (
          <div className="space-y-3 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-3 text-xs text-[#374151] sm:p-4">

            {spot.address && (
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-[#6B7280]">住所</div>
                <div className="text-[12px] text-[#111827]">{spot.address}</div>
              </div>
            )}

            {/* 外部リンク（スマホでも押しやすいボタン） */}
            <div className="flex flex-wrap gap-2">
              {spot.reserve_url && (
                <a
                  href={spot.reserve_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full bg-[#F97316] px-4 py-2 text-[12px] font-semibold text-white shadow-sm shadow-[#F97316A0] hover:bg-[#EA580C]"
                >
                  予約サイト
                </a>
              )}
              {spot.google_map_url && (
                <a
                  href={spot.google_map_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full bg-[#2563EB] px-4 py-2 text-[12px] font-semibold text-white shadow-sm shadow-[#2563EBA0] hover:bg-[#1D4ED8]"
                >
                  Googleマップ
                </a>
              )}
              {spot.instagram_url && (
                <a
                  href={spot.instagram_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full bg-[#E1306C] px-4 py-2 text-[12px] font-semibold text-white shadow-sm shadow-[#E1306CA0] hover:bg-[#C2185B]"
                >
                  Instagram
                </a>
              )}
            </div>
          </div>
        )}

        {/* 説明（読みやすい） */}
        {spot.description && (
          <div className="rounded-2xl bg-[#FFF7ED] p-3 text-sm text-[#4B5563] whitespace-pre-line">
            {spot.description}
          </div>
        )}

        {/* Google Map 埋め込み */}
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

      {/* 「行った！」カード（スマホで押しやすい） */}
      <section className="rounded-3xl border border-[#BBF7D0] bg-[#ECFDF3] p-4 shadow-md shadow-[#22C55E40]">
        <h3 className="text-sm font-semibold text-[#166534]">
          このスポットにデートで行った？
        </h3>
        <p className="mt-1 text-xs text-[#374151]">
          行ったら「行った！」を押して思い出に残そう。
        </p>

        <button
          type="button"
          onClick={handleVisit}
          disabled={visitLoading || isVisited}
          className="mt-3 w-full rounded-full bg-[#22C55E] px-4 py-3 text-sm font-semibold text-white shadow-md shadow-[#22C55E80] transition hover:bg-[#16A34A] disabled:opacity-60 disabled:shadow-none"
        >
          {isVisited ? '行った！登録済み' : visitLoading ? '登録中…' : '行った！'}
        </button>

        {visitError && <p className="mt-2 text-xs text-[#B91C1C]">{visitError}</p>}
      </section>

      {/* 管理者リンク */}
      {isAdmin && (
        <Link
          href={`/spots/${spot.id}/edit`}
          className="block text-center text-[12px] text-[#6B7280] underline underline-offset-4 hover:text-[#111827]"
        >
          このスポットを編集する（管理者）
        </Link>
      )}

      {/* ---------------------------
          画像拡大モーダル（スワイプ対応）
         --------------------------- */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3"
          role="dialog"
          aria-modal="true"
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 閉じるボタン */}
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-2 top-2 rounded-full bg-black/70 px-3 py-2 text-xs font-semibold text-white hover:bg-black"
              aria-label="閉じる"
            >
              ✕
            </button>

            {/* 画像表示エリア（ここでスワイプ検出） */}
            <div
              className="overflow-hidden rounded-2xl bg-white"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={allImages[modalIndex]}
                alt=""
                className="max-h-[80vh] w-full select-none object-contain bg-black"
                draggable={false}
              />
            </div>

            {/* 前後ボタン（指でも押せる） */}
            <div className="mt-2 flex items-center justify-between text-white">
              <button
                type="button"
                disabled={modalIndex <= 0}
                onClick={() => setModalIndex((i) => Math.max(0, i - 1))}
                className="rounded-full bg-black/60 px-4 py-2 text-xs font-semibold disabled:opacity-40"
              >
                ← 前へ
              </button>

              <div className="text-[11px] opacity-80">
                {modalIndex + 1} / {allImages.length}
              </div>

              <button
                type="button"
                disabled={modalIndex >= allImages.length - 1}
                onClick={() =>
                  setModalIndex((i) => Math.min(allImages.length - 1, i + 1))
                }
                className="rounded-full bg-black/60 px-4 py-2 text-xs font-semibold disabled:opacity-40"
              >
                次へ →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
