'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { ADMIN_EMAILS } from '@/config/admin'

type Spot = {
  id: string; name: string; area: string | null; genre: string | null
  address: string | null; description: string | null; budget: string | null
  reserve_url: string | null; google_map_url: string | null
  lat: number | null; lng: number | null; image_url: string | null; instagram_url: string | null
}
type SpotImage = { id: string; spot_id: string; image_url: string; sort_order: number; created_at: string }
type FormState = {
  name: string; area: string; genre: string; address: string; description: string
  budget: string; reserve_url: string; google_map_url: string; lat: string; lng: string; instagram_url: string
}

const BUCKET = 'Pictures'
const INPUT_STYLE: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13, outline: 'none',
  background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', boxSizing: 'border-box',
}
const LABEL_STYLE: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6, letterSpacing: '0.06em' }

export default function EditSpotPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params?.id

  const [loading, setLoading]   = useState(true)
  const [isAdmin, setIsAdmin]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [coverFile, setCoverFile]             = useState<File | null>(null)
  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(null)
  const [gallery, setGallery]                 = useState<SpotImage[]>([])
  const [galleryLoading, setGalleryLoading]   = useState(false)
  const [galleryUploading, setGalleryUploading] = useState(false)
  const [galleryFiles, setGalleryFiles]       = useState<File[]>([])

  const previewUrls = useMemo(() => galleryFiles.map(f => URL.createObjectURL(f)), [galleryFiles])
  useEffect(() => () => previewUrls.forEach(u => URL.revokeObjectURL(u)), [previewUrls])

  const [form, setForm] = useState<FormState>({
    name: '', area: '', genre: '', address: '', description: '',
    budget: '', reserve_url: '', google_map_url: '', lat: '', lng: '', instagram_url: '',
  })

  useEffect(() => {
    if (!id) { setError('IDが不正です'); setLoading(false); return }
    const load = async () => {
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession()
      if (sessionErr || !session?.user) { router.push('/login'); return }
      const email = session.user.email ?? ''
      if (!ADMIN_EMAILS.includes(email as never)) {
        setError('このページにアクセスする権限がありません'); setIsAdmin(false); setLoading(false); return
      }
      setIsAdmin(true)
      const { data, error } = await supabase.from('spots')
        .select('id,name,area,genre,address,description,budget,reserve_url,google_map_url,lat,lng,image_url,instagram_url')
        .eq('id', id).maybeSingle()
      if (error || !data) { setError('スポット情報の取得に失敗しました'); setLoading(false); return }
      const spot = data as Spot
      setForm({
        name: spot.name ?? '', area: spot.area ?? '', genre: spot.genre ?? '',
        address: spot.address ?? '', description: spot.description ?? '',
        budget: spot.budget ?? '', reserve_url: spot.reserve_url ?? '',
        google_map_url: spot.google_map_url ?? '',
        lat: spot.lat != null ? String(spot.lat) : '',
        lng: spot.lng != null ? String(spot.lng) : '',
        instagram_url: spot.instagram_url ?? '',
      })
      setExistingCoverUrl(spot.image_url ?? null)
      await loadGallery(id)
      setLoading(false)
    }
    load()
  }, [id, router])

  const loadGallery = async (spotId: string) => {
    setGalleryLoading(true)
    const { data } = await supabase.from('spot_images').select('id,spot_id,image_url,sort_order,created_at')
      .eq('spot_id', spotId).order('sort_order', { ascending: true })
    setGallery((data ?? []) as SpotImage[])
    setGalleryLoading(false)
  }

  const handleChange = (field: keyof FormState, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleAddGalleryImages = async () => {
    setError(null)
    if (!id || !galleryFiles.length) return
    setGalleryUploading(true)
    try {
      const baseOrder = gallery.length ? Math.max(...gallery.map(g => g.sort_order)) + 1 : 0
      const rows: { spot_id: string; image_url: string; sort_order: number }[] = []
      for (let i = 0; i < galleryFiles.length; i++) {
        const file = galleryFiles[i]
        const ext = file.name.split('.').pop() || 'jpg'
        const filePath = `spots/${id}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`
        const { data: uploadData, error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, file, { upsert: false, contentType: file.type })
        if (uploadError) throw uploadError
        const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(uploadData.path)
        rows.push({ spot_id: id, image_url: publicUrlData.publicUrl, sort_order: baseOrder + i })
      }
      const { error: insertError } = await supabase.from('spot_images').insert(rows)
      if (insertError) throw insertError
      setGalleryFiles([])
      await loadGallery(id)
    } catch (e: unknown) {
      setError('画像追加に失敗しました: ' + (e instanceof Error ? e.message : ''))
    } finally { setGalleryUploading(false) }
  }

  const handleDeleteGalleryImage = async (imageId: string) => {
    if (!id || !window.confirm('この画像を削除しますか？')) return
    const { error } = await supabase.from('spot_images').delete().eq('id', imageId)
    if (error) { setError('画像削除に失敗しました'); return }
    await loadGallery(id)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!id || !form.name.trim()) { setError('スポット名は必須です'); return }
    setSaving(true)
    let image_url: string | null = existingCoverUrl
    if (coverFile) {
      try {
        const ext = coverFile.name.split('.').pop() || 'jpg'
        const filePath = `spots/${id}/cover-${Date.now()}.${ext}`
        const { data: uploadData, error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, coverFile, { upsert: true, contentType: coverFile.type })
        if (uploadError) throw uploadError
        const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(uploadData.path)
        image_url = publicUrlData.publicUrl
      } catch (err) { setError('カバー画像のアップロードに失敗しました'); setSaving(false); return }
    }
    const { error: updateError } = await supabase.from('spots').update({
      name: form.name.trim(), area: form.area.trim() || null, genre: form.genre.trim() || null,
      address: form.address.trim() || null, description: form.description.trim() || null,
      budget: form.budget.trim() || null, reserve_url: form.reserve_url.trim() || null,
      google_map_url: form.google_map_url.trim() || null,
      lat: form.lat ? Number(form.lat) : null, lng: form.lng ? Number(form.lng) : null,
      image_url, instagram_url: form.instagram_url.trim() || null,
    }).eq('id', id)
    if (updateError) { setError('更新に失敗しました: ' + updateError.message); setSaving(false); return }
    router.push(`/spots/${id}`)
  }

  const handleDeleteSpot = async () => {
    if (!id || !window.confirm('このスポットを削除しますか？\nこの操作は元に戻せません。')) return
    setDeleting(true)
    const { error } = await supabase.from('spots').delete().eq('id', id)
    if (error) { setError('削除に失敗しました: ' + error.message); setDeleting(false); return }
    router.push('/spots')
  }

  if (loading) return (
    <div style={{ maxWidth: 680, margin: '60px auto', textAlign: 'center', color: 'var(--muted)' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--gold)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
  if (!isAdmin) return (
    <div style={{ maxWidth: 680, margin: '60px auto', padding: '0 20px' }}>
      <p style={{ color: '#f87171', fontSize: 14, marginBottom: 12 }}>{error}</p>
      <Link href="/spots" style={{ color: 'var(--gold)', fontSize: 13 }}>← スポット一覧に戻る</Link>
    </div>
  )

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 80px' }}>
      <Link href={id ? `/spots/${id}` : '/spots'} style={{ fontSize: 12, color: 'var(--muted)', display: 'inline-flex', gap: 4, marginBottom: 20, textDecoration: 'none' }}>
        ← スポット詳細に戻る
      </Link>

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 10 }}>
          <span style={{ width: 32, height: 1, background: 'var(--gold)', display: 'inline-block', opacity: 0.5 }} />
          <span style={{ fontSize: 10, letterSpacing: '0.3em', color: 'var(--gold)', opacity: 0.8 }}>EDIT SPOT</span>
          <span style={{ width: 32, height: 1, background: 'var(--gold)', display: 'inline-block', opacity: 0.5 }} />
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, padding: '4px 14px' }}>
          <span style={{ fontSize: 11, color: '#a5b4fc', fontWeight: 600, letterSpacing: '0.08em' }}>✎ スポット編集</span>
        </div>
        <h2 className="font-mincho" style={{ fontSize: 20, fontWeight: 700, color: 'var(--cream)' }}>スポット情報を編集</h2>
      </div>

      {/* ギャラリー編集 */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, padding: '20px', marginBottom: 16 }}>
        <h3 className="font-mincho" style={{ fontSize: 15, fontWeight: 600, color: 'var(--cream)', marginBottom: 16 }}>
          ギャラリー画像
        </h3>
        {galleryLoading ? (
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>読み込み中…</p>
        ) : gallery.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
            {gallery.map(img => (
              <div key={img.id} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.image_url} alt="" style={{ width: '100%', height: 90, objectFit: 'cover', display: 'block' }} />
                <button type="button" onClick={() => handleDeleteGalleryImage(img.id)}
                  style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: 8, padding: '3px 8px', fontSize: 10, cursor: 'pointer' }}>
                  削除
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>まだギャラリー画像がありません</p>
        )}

        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '14px' }}>
          <label style={LABEL_STYLE}>画像を追加</label>
          <input type="file" accept="image/*" multiple onChange={e => setGalleryFiles(Array.from(e.target.files ?? []))}
            style={{ ...INPUT_STYLE, padding: '8px 12px', cursor: 'pointer', marginBottom: 8 }} />
          {previewUrls.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10 }}>
              {previewUrls.map((u, idx) => (
                <div key={u} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt={`preview-${idx}`} style={{ width: '100%', height: 64, objectFit: 'cover', display: 'block' }} />
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={handleAddGalleryImages} disabled={galleryUploading || saving || !galleryFiles.length}
              style={{ padding: '9px 16px', borderRadius: 10, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'var(--gold)', color: '#1a1200', opacity: galleryFiles.length === 0 ? 0.5 : 1 }}>
              {galleryUploading ? 'アップロード中…' : '画像を追加'}
            </button>
            <button type="button" onClick={() => setGalleryFiles([])} disabled={galleryUploading}
              style={{ padding: '9px 16px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 12, cursor: 'pointer', background: 'transparent', color: 'var(--muted)' }}>
              クリア
            </button>
          </div>
        </div>
      </div>

      {/* 基本情報フォーム */}
      <form onSubmit={handleSubmit}
        style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* カバー画像 */}
        <div>
          <label style={LABEL_STYLE}>カバー画像（表紙）</label>
          {existingCoverUrl && (
            <div style={{ marginBottom: 8, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={existingCoverUrl} alt={form.name} style={{ width: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }} />
            </div>
          )}
          <input type="file" accept="image/*" onChange={e => setCoverFile(e.target.files?.[0] ?? null)}
            style={{ ...INPUT_STYLE, padding: '8px 12px', cursor: 'pointer' }} />
          <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>変更する場合のみ選択してください</p>
        </div>

        {/* スポット名 */}
        <div>
          <label style={LABEL_STYLE}>スポット名 <span style={{ color: '#f87171' }}>*</span></label>
          <input style={INPUT_STYLE} value={form.name} onChange={e => handleChange('name', e.target.value)} />
        </div>

        {/* エリア・ジャンル */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={LABEL_STYLE}>エリア（カンマ区切りで複数可）</label>
            <input style={INPUT_STYLE} value={form.area} onChange={e => handleChange('area', e.target.value)} placeholder="例：渋谷,新宿" />
          </div>
          <div>
            <label style={LABEL_STYLE}>ジャンル（カンマ区切りで複数可）</label>
            <input style={INPUT_STYLE} value={form.genre} onChange={e => handleChange('genre', e.target.value)} placeholder="例：ランチ,カフェ" />
          </div>
        </div>

        <div>
          <label style={LABEL_STYLE}>住所</label>
          <input style={INPUT_STYLE} value={form.address} onChange={e => handleChange('address', e.target.value)} />
        </div>

        <div>
          <label style={LABEL_STYLE}>備考・説明</label>
          <textarea style={{ ...INPUT_STYLE, height: 96, resize: 'vertical' }}
            value={form.description} onChange={e => handleChange('description', e.target.value)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={LABEL_STYLE}>予算</label>
            <input style={INPUT_STYLE} value={form.budget} onChange={e => handleChange('budget', e.target.value)} placeholder="¥3,000〜" />
          </div>
          <div>
            <label style={LABEL_STYLE}>予約サイトURL</label>
            <input type="url" style={INPUT_STYLE} value={form.reserve_url} onChange={e => handleChange('reserve_url', e.target.value)} placeholder="https://..." />
          </div>
        </div>

        <div>
          <label style={LABEL_STYLE}>InstagramURL</label>
          <input type="url" style={INPUT_STYLE} value={form.instagram_url} onChange={e => handleChange('instagram_url', e.target.value)} placeholder="https://instagram.com/..." />
        </div>

        <div>
          <label style={LABEL_STYLE}>Google MapURL</label>
          <input type="url" style={INPUT_STYLE} value={form.google_map_url} onChange={e => handleChange('google_map_url', e.target.value)} placeholder="https://maps.app.goo.gl/..." />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={LABEL_STYLE}>緯度（lat）</label>
            <input style={INPUT_STYLE} value={form.lat} onChange={e => handleChange('lat', e.target.value)} placeholder="35.6..." />
          </div>
          <div>
            <label style={LABEL_STYLE}>経度（lng）</label>
            <input style={INPUT_STYLE} value={form.lng} onChange={e => handleChange('lng', e.target.value)} placeholder="139.7..." />
          </div>
        </div>

        {error && <p style={{ fontSize: 12, color: '#f87171' }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between', paddingTop: 4 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={saving || deleting || galleryUploading}
              style={{ padding: '11px 24px', borderRadius: 12, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'var(--gold)', color: '#1a1200', opacity: saving ? 0.6 : 1 }}>
              {saving ? '保存中…' : '変更を保存する'}
            </button>
            <button type="button" onClick={() => router.push(id ? `/spots/${id}` : '/spots')}
              disabled={saving || deleting}
              style={{ padding: '11px 24px', borderRadius: 12, border: '1px solid var(--border)', fontSize: 13, cursor: 'pointer', background: 'transparent', color: 'var(--muted)' }}>
              キャンセル
            </button>
          </div>
          <button type="button" onClick={handleDeleteSpot} disabled={saving || deleting}
            style={{ padding: '11px 20px', borderRadius: 12, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: '#7f1d1d', color: '#fca5a5', opacity: deleting ? 0.6 : 1 }}>
            {deleting ? '削除中…' : 'このスポットを削除'}
          </button>
        </div>
      </form>
    </div>
  )
}