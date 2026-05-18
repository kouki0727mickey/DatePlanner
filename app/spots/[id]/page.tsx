'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { ADMIN_EMAILS } from '@/config/admin'

type Spot = {
  id: string
  name: string
  area: string | null
  genre: string | null
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

type SpotImage = { id: string; image_url: string; sort_order: number }

const TAG_STYLE_AREA: React.CSSProperties = {
  fontSize: 11, padding: '3px 10px', borderRadius: 20,
  background: 'rgba(201,169,110,0.12)', border: '1px solid rgba(201,169,110,0.3)',
  color: 'var(--gold-light)',
}
const TAG_STYLE_GENRE: React.CSSProperties = {
  fontSize: 11, padding: '3px 10px', borderRadius: 20,
  background: 'rgba(201,169,110,0.05)', border: '1px solid var(--border)',
  color: 'var(--muted)',
}

export default function SpotDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params?.id

  const [spot, setSpot]       = useState<Spot | null>(null)
  const [images, setImages]   = useState<SpotImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [email, setEmail]     = useState<string | null>(null)
  const isAdmin = !!email && ADMIN_EMAILS.includes(email)

  const [isVisited, setIsVisited]     = useState(false)
  const [visitLoading, setVisitLoading] = useState(false)
  const [visitError, setVisitError]   = useState<string | null>(null)

  const [modalOpen, setModalOpen]   = useState(false)
  const [modalIndex, setModalIndex] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const touchLock   = useRef(false)

  useEffect(() => {
    if (!id) { setError('IDが不正です'); setLoading(false); return }
    const load = async () => {
      try {
        const { data: spotData, error: spotErr } = await supabase
          .from('spots')
          .select('id,name,area,genre,address,description,lat,lng,image_url,budget,reserve_url,google_map_url,instagram_url')
          .eq('id', id).maybeSingle()
        if (spotErr) { setError(spotErr.message); setLoading(false); return }
        if (!spotData) { setError('スポットが見つかりませんでした'); setLoading(false); return }
        setSpot(spotData as Spot)
        const { data: imgData } = await supabase
          .from('spot_images').select('id,image_url,sort_order')
          .eq('spot_id', id).order('sort_order', { ascending: true })
        setImages((imgData ?? []) as SpotImage[])
      } catch { setError('読み込み中にエラーが発生しました') }
      setLoading(false)
    }
    load()
  }, [id])

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data }) => setEmail(data.session?.user.email ?? null))
      .catch(() => setEmail(null))
  }, [])

  const coverUrl = useMemo(() =>
    spot?.image_url ?? (images.length ? images[0].image_url : null),
    [spot?.image_url, images]
  )
  const allImages = useMemo(() => {
    const list: string[] = []
    if (coverUrl) list.push(coverUrl)
    for (const img of images) if (!list.includes(img.image_url)) list.push(img.image_url)
    return list
  }, [coverUrl, images])

  // カンマ区切りで分割
  const areas  = useMemo(() => (spot?.area  ?? '').split(',').map(s => s.trim()).filter(Boolean), [spot?.area])
  const genres = useMemo(() => (spot?.genre ?? '').split(',').map(s => s.trim()).filter(Boolean), [spot?.genre])

  const openModalAt = (i: number) => { setModalIndex(i); setModalOpen(true); touchLock.current = false }
  const closeModal  = () => { setModalOpen(false); touchStartX.current = null; touchStartY.current = null }

  useEffect(() => {
    if (!modalOpen) return
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
      if (e.key === 'ArrowLeft')  setModalIndex(i => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setModalIndex(i => Math.min(allImages.length - 1, i + 1))
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [modalOpen, allImages.length])

  const onTouchStart = (e: React.TouchEvent) => {
    if (!e.touches?.length) return
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    touchLock.current = false
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchLock.current || touchStartX.current == null || touchStartY.current == null || !e.touches?.length) return
    const dx = e.touches[0].clientX - touchStartX.current
    const dy = e.touches[0].clientY - touchStartY.current
    if (Math.abs(dy) > 40) return
    if (dx > 60)       { touchLock.current = true; setModalIndex(i => Math.max(0, i - 1)) }
    else if (dx < -60) { touchLock.current = true; setModalIndex(i => Math.min(allImages.length - 1, i + 1)) }
  }
  const onTouchEnd = () => {
    touchStartX.current = null; touchStartY.current = null
    setTimeout(() => { touchLock.current = false }, 120)
  }

  const handleVisit = async () => {
    if (!spot) return
    setVisitError(null)
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) { setVisitError('ログイン情報の取得に失敗しました'); return }
      if (!data.session?.user) { router.push('/login'); return }
      setVisitLoading(true)
      const { data: existing } = await supabase.from('visits').select('id')
        .eq('user_id', data.session.user.id).eq('spot_id', spot.id).limit(1)
      if (existing && existing.length > 0) { setIsVisited(true); setVisitLoading(false); return }
      const { error: insertErr } = await supabase.from('visits')
        .insert({ user_id: data.session.user.id, spot_id: spot.id })
      if (insertErr) { setVisitError('登録に失敗しました'); setVisitLoading(false); return }
      setIsVisited(true); setVisitLoading(false)
    } catch { setVisitError('エラーが発生しました'); setVisitLoading(false) }
  }

  if (loading) return (
    <div style={{ maxWidth: 680, margin: '60px auto', textAlign: 'center', color: 'var(--muted)' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--gold)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
      <p className="font-mincho" style={{ fontSize: 13 }}>読み込み中…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!spot || error) return (
    <div style={{ maxWidth: 680, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
      <p style={{ color: 'var(--muted)', marginBottom: 16 }}>{error ?? 'スポット情報が取得できませんでした'}</p>
      <Link href="/spots" style={{ color: 'var(--gold)', fontSize: 13 }}>← スポット一覧に戻る</Link>
    </div>
  )

  const mapSrc = spot.lat && spot.lng
    ? `https://www.google.com/maps?q=${spot.lat},${spot.lng}&z=17&output=embed` : null

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 80px' }}>
      {/* ページ種別バッジ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <Link href="/spots" style={{ fontSize: 12, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
          ← スポット一覧に戻る
        </Link>
      </div>

      {/* メインカード */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
        {coverUrl && (
          <button type="button" onClick={() => openModalAt(0)}
            style={{ display: 'block', width: '100%', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverUrl} alt={spot.name} style={{ width: '100%', height: 280, objectFit: 'cover', display: 'block' }} />
          </button>
        )}

        <div style={{ padding: '20px 20px 24px' }}>
          <h1 className="font-mincho" style={{ fontSize: 22, fontWeight: 700, color: 'var(--cream)', marginBottom: 12, lineHeight: 1.4 }}>
            {spot.name}
          </h1>

          {/* エリア・ジャンルタグ：カンマ区切りを個別に表示 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {areas.map(a => <span key={a} style={TAG_STYLE_AREA}>📍 {a}</span>)}
            {genres.map(g => <span key={g} style={TAG_STYLE_GENRE}>{g}</span>)}
            {spot.budget && (
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80' }}>
                💴 {spot.budget}
              </span>
            )}
          </div>

          {spot.description && (
            <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--text)', whiteSpace: 'pre-line', marginBottom: 20, padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid var(--border)' }}>
              {spot.description}
            </p>
          )}

          {(spot.address || spot.reserve_url || spot.google_map_url || spot.instagram_url) && (
            <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
              {spot.address && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.1em', marginBottom: 4 }}>住所</div>
                  <div style={{ fontSize: 13, color: 'var(--text)' }}>{spot.address}</div>
                </div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {spot.reserve_url && (
                  <a href={spot.reserve_url} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, padding: '8px 18px', borderRadius: 20, background: 'var(--gold)', color: '#1a1200', fontWeight: 600, textDecoration: 'none' }}>
                    予約サイト
                  </a>
                )}
                {spot.google_map_url && (
                  <a href={spot.google_map_url} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, padding: '8px 18px', borderRadius: 20, background: '#2563EB', color: '#fff', fontWeight: 600, textDecoration: 'none' }}>
                    Google Map
                  </a>
                )}
                {spot.instagram_url && (
                  <a href={spot.instagram_url} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, padding: '8px 18px', borderRadius: 20, background: '#E1306C', color: '#fff', fontWeight: 600, textDecoration: 'none' }}>
                    Instagram
                  </a>
                )}
              </div>
            </div>
          )}

          {allImages.length > 1 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.1em', marginBottom: 8 }}>GALLERY</div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {allImages.map((url, idx) => (
                  <button key={url + idx} type="button" onClick={() => openModalAt(idx)}
                    style={{ flexShrink: 0, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: 'none', cursor: 'pointer', padding: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" style={{ width: 120, height: 80, objectFit: 'cover', display: 'block' }} loading="lazy" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {mapSrc && (
            <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.1em', padding: '10px 14px 6px' }}>LOCATION MAP</div>
              <iframe src={mapSrc} style={{ width: '100%', height: 220, display: 'block', border: 'none' }} loading="lazy" />
            </div>
          )}
        </div>
      </div>

      {/* 行った！ */}
      <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 16, padding: '16px 20px', marginBottom: 16 }}>
        <p className="font-mincho" style={{ fontSize: 14, fontWeight: 600, color: '#4ade80', marginBottom: 4 }}>
          このスポットにデートで行った？
        </p>
        <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>
          行ったら「行った！」を押して思い出に残そう
        </p>
        <button type="button" onClick={handleVisit} disabled={visitLoading || isVisited}
          style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', cursor: isVisited || visitLoading ? 'not-allowed' : 'pointer', background: isVisited ? 'var(--border)' : '#22C55E', color: isVisited ? 'var(--muted)' : '#fff', fontWeight: 600, fontSize: 14, transition: 'all 0.2s' }}>
          {isVisited ? '✓ 行った！登録済み' : visitLoading ? '登録中…' : '行った！'}
        </button>
        {visitError && <p style={{ fontSize: 11, color: '#f87171', marginTop: 8 }}>{visitError}</p>}
      </div>

      {isAdmin && (
        <div style={{ textAlign: 'center' }}>
          <Link href={`/spots/${spot.id}/edit`} style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'underline' }}>
            このスポットを編集する（管理者）
          </Link>
        </div>
      )}

      {/* モーダル */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', padding: 16 }}
          role="dialog" aria-modal="true" onClick={closeModal}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 900 }} onClick={e => e.stopPropagation()}>
            <button type="button" onClick={closeModal}
              style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: 20, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>
              ✕
            </button>
            <div style={{ borderRadius: 16, overflow: 'hidden' }}
              onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={allImages[modalIndex]} alt="" style={{ maxHeight: '80vh', width: '100%', objectFit: 'contain', background: '#000', display: 'block', userSelect: 'none' }} draggable={false} />
            </div>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff' }}>
              <button type="button" disabled={modalIndex <= 0} onClick={() => setModalIndex(i => Math.max(0, i - 1))}
                style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: 20, padding: '8px 16px', fontSize: 12, cursor: modalIndex <= 0 ? 'not-allowed' : 'pointer', opacity: modalIndex <= 0 ? 0.4 : 1 }}>
                ← 前へ
              </button>
              <span style={{ fontSize: 11, opacity: 0.8 }}>{modalIndex + 1} / {allImages.length}</span>
              <button type="button" disabled={modalIndex >= allImages.length - 1} onClick={() => setModalIndex(i => Math.min(allImages.length - 1, i + 1))}
                style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: 20, padding: '8px 16px', fontSize: 12, cursor: modalIndex >= allImages.length - 1 ? 'not-allowed' : 'pointer', opacity: modalIndex >= allImages.length - 1 ? 0.4 : 1 }}>
                次へ →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}