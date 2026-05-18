'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { ADMIN_EMAILS } from '@/config/admin'

type FormState = {
  name: string; area: string; genre: string; address: string; description: string
  budget: string; reserve_url: string; google_map_url: string; lat: string; lng: string; instagram_url: string
}
type UploadedImage = { url: string; path: string }

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13, outline: 'none',
  background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)',
  boxSizing: 'border-box',
}
const LABEL_STYLE: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6, letterSpacing: '0.06em' }

export default function NewSpotPage() {
  const router = useRouter()
  const [loading, setLoading]   = useState(true)
  const [isAdmin, setIsAdmin]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [previews, setPreviews]     = useState<string[]>([])
  const [coverIndex, setCoverIndex] = useState(0)
  const [form, setForm] = useState<FormState>({
    name: '', area: '', genre: '', address: '', description: '',
    budget: '', reserve_url: '', google_map_url: '', lat: '', lng: '', instagram_url: '',
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error || !data.session?.user) { router.push('/login'); return }
      const email = data.session.user.email ?? ''
      if (!ADMIN_EMAILS.includes(email as never)) {
        setError('このページにアクセスする権限がありません')
        setIsAdmin(false)
      } else { setIsAdmin(true) }
      setLoading(false)
    })
  }, [router])

  const handleChange = (field: keyof FormState, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handlePickImages = (files: FileList | null) => {
    if (!files) return
    const merged = [...imageFiles, ...Array.from(files)].slice(0, 10)
    setImageFiles(merged)
    setPreviews(merged.map(f => URL.createObjectURL(f)))
    setCoverIndex(idx => Math.min(idx, Math.max(0, merged.length - 1)))
  }

  const removeImageAt = (index: number) => {
    const nextFiles = imageFiles.filter((_, i) => i !== index)
    setImageFiles(nextFiles)
    setPreviews(nextFiles.map(f => URL.createObjectURL(f)))
    setCoverIndex(idx => {
      if (nextFiles.length === 0) return 0
      if (index === idx) return 0
      if (index < idx) return idx - 1
      return Math.min(idx, nextFiles.length - 1)
    })
  }

  const uploadOne = async (file: File): Promise<UploadedImage> => {
    const ext = file.name.split('.').pop() || 'jpg'
    const filePath = `spots/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`
    const { data: uploadData, error: uploadError } = await supabase.storage.from('Pictures').upload(filePath, file)
    if (uploadError) throw uploadError
    const { data: publicUrlData } = supabase.storage.from('Pictures').getPublicUrl(uploadData.path)
    return { url: publicUrlData.publicUrl, path: uploadData.path }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.name.trim()) { setError('スポット名は必須です'); return }
    setSaving(true)
    try {
      const uploaded: UploadedImage[] = []
      for (const f of imageFiles) uploaded.push(await uploadOne(f))
      const coverUrl = uploaded.length > 0 ? uploaded[Math.min(coverIndex, uploaded.length - 1)].url : null
      const { data, error } = await supabase.from('spots').insert({
        name: form.name.trim(),
        area: form.area.trim() || null,
        genre: form.genre.trim() || null,
        address: form.address.trim() || null,
        description: form.description.trim() || null,
        budget: form.budget.trim() || null,
        reserve_url: form.reserve_url.trim() || null,
        google_map_url: form.google_map_url.trim() || null,
        lat: form.lat ? Number(form.lat) : null,
        lng: form.lng ? Number(form.lng) : null,
        image_url: coverUrl,
        instagram_url: form.instagram_url.trim() || null,
      }).select('id').maybeSingle()
      if (error) { setError('登録に失敗しました: ' + error.message); setSaving(false); return }
      const spotId = data?.id as string | undefined
      if (!spotId) { setError('スポットIDの取得に失敗しました'); setSaving(false); return }
      if (uploaded.length > 0) {
        await supabase.from('spot_images').insert(uploaded.map((u, idx) => ({ spot_id: spotId, image_url: u.url, sort_order: idx })))
      }
      router.push(`/spots/${spotId}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
      setSaving(false)
    }
  }

  if (loading) return (
    <div style={{ maxWidth: 680, margin: '60px auto', textAlign: 'center', color: 'var(--muted)' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--gold)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
  if (!isAdmin) return <div style={{ maxWidth: 680, margin: '60px auto', padding: '0 20px', color: '#f87171', fontSize: 14 }}>{error}</div>

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 80px' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 10 }}>
          <span style={{ width: 32, height: 1, background: 'var(--gold)', display: 'inline-block', opacity: 0.5 }} />
          <span style={{ fontSize: 10, letterSpacing: '0.3em', color: 'var(--gold)', opacity: 0.8 }}>NEW SPOT</span>
          <span style={{ width: 32, height: 1, background: 'var(--gold)', display: 'inline-block', opacity: 0.5 }} />
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8, background: 'rgba(99,214,110,0.1)', border: '1px solid rgba(99,214,110,0.3)', borderRadius: 20, padding: '4px 14px' }}>
          <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 600, letterSpacing: '0.08em' }}>✚ スポット追加</span>
        </div>
        <h2 className="font-mincho" style={{ fontSize: 20, fontWeight: 700, color: 'var(--cream)' }}>新規スポット登録</h2>
        <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>管理者専用 — スポット名だけ入れておけばあとから編集できます</p>
      </div>

      <form onSubmit={handleSubmit}
        style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* スポット名 */}
        <div>
          <label style={LABEL_STYLE}>スポット名 <span style={{ color: '#f87171' }}>*</span></label>
          <input style={INPUT_STYLE} value={form.name} onChange={e => handleChange('name', e.target.value)} placeholder="例：東京スカイツリー" />
        </div>

        {/* エリア・ジャンル */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={LABEL_STYLE}>エリア（カンマ区切りで複数可）</label>
            <input style={INPUT_STYLE} value={form.area} onChange={e => handleChange('area', e.target.value)} placeholder="例：渋谷,新宿" />
          </div>
          <div>
            <label style={LABEL_STYLE}>ジャンル（カンマ区切りで複数可）</label>
            <input style={INPUT_STYLE} value={form.genre} onChange={e => handleChange('genre', e.target.value)} placeholder="例：ランチ,カフェ,記念日用" />
          </div>
        </div>

        {/* 住所 */}
        <div>
          <label style={LABEL_STYLE}>住所</label>
          <input style={INPUT_STYLE} value={form.address} onChange={e => handleChange('address', e.target.value)} />
        </div>

        {/* 備考 */}
        <div>
          <label style={LABEL_STYLE}>備考・説明</label>
          <textarea style={{ ...INPUT_STYLE, height: 96, resize: 'vertical' }}
            value={form.description} onChange={e => handleChange('description', e.target.value)}
            placeholder="デートにおすすめなポイントや雰囲気など" />
        </div>

        {/* 画像アップロード */}
        <div>
          <label style={LABEL_STYLE}>ギャラリー画像（複数可・最大10枚）</label>
          <input type="file" accept="image/*" multiple onChange={e => handlePickImages(e.target.files)}
            style={{ ...INPUT_STYLE, padding: '8px 12px', cursor: 'pointer' }} />
          {previews.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>カバー画像をタップして選択</p>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {previews.map((src, idx) => (
                  <div key={src + idx} style={{ position: 'relative', flexShrink: 0 }}>
                    <button type="button" onClick={() => setCoverIndex(idx)}
                      style={{ padding: 0, border: `2px solid ${coverIndex === idx ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 10, overflow: 'hidden', cursor: 'pointer', background: 'none' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" style={{ width: 100, height: 70, objectFit: 'cover', display: 'block' }} />
                    </button>
                    <button type="button" onClick={() => removeImageAt(idx)}
                      style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: 10, padding: '2px 6px', fontSize: 10, cursor: 'pointer' }}>
                      ✕
                    </button>
                    {coverIndex === idx && (
                      <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--gold)', marginTop: 2 }}>カバー</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 予算・予約 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={LABEL_STYLE}>予算</label>
            <input style={INPUT_STYLE} value={form.budget} onChange={e => handleChange('budget', e.target.value)} placeholder="例：¥3,000〜4,000 / 人" />
          </div>
          <div>
            <label style={LABEL_STYLE}>予約サイトURL</label>
            <input type="url" style={INPUT_STYLE} value={form.reserve_url} onChange={e => handleChange('reserve_url', e.target.value)} placeholder="https://..." />
          </div>
        </div>

        {/* Instagram */}
        <div>
          <label style={LABEL_STYLE}>InstagramURL</label>
          <input type="url" style={INPUT_STYLE} value={form.instagram_url} onChange={e => handleChange('instagram_url', e.target.value)} placeholder="https://instagram.com/..." />
        </div>

        {/* Google Map */}
        <div>
          <label style={LABEL_STYLE}>Google MapURL</label>
          <input type="url" style={INPUT_STYLE} value={form.google_map_url} onChange={e => handleChange('google_map_url', e.target.value)} placeholder="https://maps.app.goo.gl/..." />
        </div>

        {/* 緯度・経度 */}
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

        <button type="submit" disabled={saving}
          style={{ padding: '13px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 600, letterSpacing: '0.08em', cursor: saving ? 'not-allowed' : 'pointer', background: saving ? 'var(--border)' : 'var(--gold)', color: saving ? 'var(--muted)' : '#1a1200', transition: 'all 0.2s' }}>
          {saving ? '登録中…' : 'スポットを登録する ✦'}
        </button>
      </form>
    </div>
  )
}