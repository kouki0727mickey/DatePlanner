// app/spots/[id]/edit/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
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
  budget: string | null
  reserve_url: string | null
  google_map_url: string | null
  lat: number | null
  lng: number | null
  image_url: string | null // ← カバー画像として残す
  instagram_url: string | null
}

type SpotImage = {
  id: string
  spot_id: string
  image_url: string
  sort_order: number
  created_at: string
}

type FormState = {
  name: string
  area: string
  genre: string
  address: string
  description: string
  budget: string
  reserve_url: string
  google_map_url: string
  lat: string
  lng: string
  instagram_url: string
}

const BUCKET = 'Pictures' // ← いま使ってる bucket を流用

export default function EditSpotPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params?.id

  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // ▼ spots.image_url（カバー画像）差し替え用
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(null)

  // ▼ 複数画像（ギャラリー）用
  const [gallery, setGallery] = useState<SpotImage[]>([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [galleryUploading, setGalleryUploading] = useState(false)
  const [galleryFiles, setGalleryFiles] = useState<File[]>([])

  const previewUrls = useMemo(() => {
    // 選択中ファイルのプレビューURLを作成
    const urls = galleryFiles.map((f) => URL.createObjectURL(f))
    return urls
  }, [galleryFiles])

  useEffect(() => {
    // preview URL の解放（メモリリーク防止）
    return () => {
      previewUrls.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [previewUrls])

  const [form, setForm] = useState<FormState>({
    name: '',
    area: '',
    genre: '',
    address: '',
    description: '',
    budget: '',
    reserve_url: '',
    google_map_url: '',
    lat: '',
    lng: '',
    instagram_url: '',
  })

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setError('URL の id が不正です')
        setLoading(false)
        return
      }

      // 1) ログイン & 管理者チェック
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        console.error(sessionError)
        setError('ログイン情報の取得に失敗しました')
        setLoading(false)
        return
      }
      if (!session?.user) {
        router.push('/login')
        return
      }

      const email = session.user.email ?? ''
      const ok = ADMIN_EMAILS.includes(email as (typeof ADMIN_EMAILS)[number])
      if (!ok) {
        setError('このページにアクセスする権限がありません。')
        setIsAdmin(false)
        setLoading(false)
        return
      }
      setIsAdmin(true)

      // 2) spot 本体ロード
      const { data, error } = await supabase
        .from('spots')
        .select(
          'id,name,area,genre,address,description,budget,reserve_url,google_map_url,lat,lng,image_url,instagram_url'
        )
        .eq('id', id)
        .maybeSingle()

      if (error) {
        console.error(error)
        setError('スポット情報の取得に失敗しました: ' + error.message)
        setLoading(false)
        return
      }
      if (!data) {
        setError('スポットが見つかりませんでした')
        setLoading(false)
        return
      }

      const spot = data as Spot
      setForm({
        name: spot.name ?? '',
        area: spot.area ?? '',
        genre: spot.genre ?? '',
        address: spot.address ?? '',
        description: spot.description ?? '',
        budget: spot.budget ?? '',
        reserve_url: spot.reserve_url ?? '',
        google_map_url: spot.google_map_url ?? '',
        lat: spot.lat != null ? String(spot.lat) : '',
        lng: spot.lng != null ? String(spot.lng) : '',
        instagram_url: spot.instagram_url ?? '',
      })
      setExistingCoverUrl(spot.image_url ?? null)

      // 3) ギャラリー（spot_images）ロード
      await loadGallery(id)

      setLoading(false)
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router])

  const loadGallery = async (spotId: string) => {
    setGalleryLoading(true)
    const { data, error } = await supabase
      .from('spot_images')
      .select('id,spot_id,image_url,sort_order,created_at')
      .eq('spot_id', spotId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error(error)
      setError('画像一覧の取得に失敗しました: ' + error.message)
      setGalleryLoading(false)
      return
    }
    setGallery((data ?? []) as SpotImage[])
    setGalleryLoading(false)
  }

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  /**
   * 複数画像を Storage にアップロードし、spot_images に insert する
   */
  const handleAddGalleryImages = async () => {
    setError(null)
    if (!id) {
      setError('URL の id が不正です')
      return
    }
    if (!galleryFiles.length) {
      setError('追加する画像ファイルを選択してください')
      return
    }

    setGalleryUploading(true)
    try {
      // 既存件数を見て sort_order を継続させる（追加順に並ぶ）
      const baseOrder = gallery.length ? Math.max(...gallery.map((g) => g.sort_order)) + 1 : 0

      const insertedRows: { spot_id: string; image_url: string; sort_order: number }[] = []

      // 1枚ずつアップロード（簡単で堅い）
      for (let i = 0; i < galleryFiles.length; i++) {
        const file = galleryFiles[i]
        const ext = file.name.split('.').pop() || 'jpg'
        const fileName = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`
        const filePath = `spots/${id}/${fileName}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(filePath, file, { upsert: false, contentType: file.type })

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(uploadData.path)

        insertedRows.push({
          spot_id: id,
          image_url: publicUrlData.publicUrl,
          sort_order: baseOrder + i,
        })
      }

      // まとめて insert
      const { error: insertError } = await supabase.from('spot_images').insert(insertedRows)
      if (insertError) throw insertError

      // 成功 → ファイル選択をリセットしてギャラリー再取得
      setGalleryFiles([])
      await loadGallery(id)
    } catch (e: any) {
      console.error(e)
      setError('画像追加に失敗しました: ' + (e?.message ?? 'unknown error'))
    } finally {
      setGalleryUploading(false)
    }
  }

  /**
   * ギャラリー画像の削除（DB行削除）
   * ※最短構成として Storage 実体削除は省略（やりたい場合は storage_path をDBに持たせるのがおすすめ）
   */
  const handleDeleteGalleryImage = async (imageId: string) => {
    setError(null)
    if (!id) return

    const ok = window.confirm('この画像を削除しますか？')
    if (!ok) return

    try {
      const { error } = await supabase.from('spot_images').delete().eq('id', imageId)
      if (error) throw error

      await loadGallery(id)
    } catch (e: any) {
      console.error(e)
      setError('画像削除に失敗しました: ' + (e?.message ?? 'unknown error'))
    }
  }

  /**
   * スポット基本情報の保存（カバー画像差し替え含む）
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!id) {
      setError('URL の id が不正です')
      return
    }
    if (!form.name.trim()) {
      setError('スポット名は必須です')
      return
    }

    setSaving(true)

    // カバー画像URL（既存 or 新規アップロード）
    let image_url: string | null = existingCoverUrl

    if (coverFile) {
      try {
        const ext = coverFile.name.split('.').pop() || 'jpg'
        const fileName = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`
        const filePath = `spots/${id}/cover-${fileName}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(filePath, coverFile, { upsert: true, contentType: coverFile.type })

        if (uploadError) {
          console.error(uploadError)
          setError('カバー画像のアップロードに失敗しました: ' + uploadError.message)
          setSaving(false)
          return
        }

        const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(uploadData.path)
        image_url = publicUrlData.publicUrl
      } catch (err) {
        console.error(err)
        setError('カバー画像のアップロード中にエラーが発生しました')
        setSaving(false)
        return
      }
    }

    const lat = form.lat ? Number(form.lat) : null
    const lng = form.lng ? Number(form.lng) : null

    const { error: updateError } = await supabase
      .from('spots')
      .update({
        name: form.name.trim(),
        area: form.area.trim() || null,
        genre: form.genre.trim() || null,
        address: form.address.trim() || null,
        description: form.description.trim() || null,
        budget: form.budget.trim() || null,
        reserve_url: form.reserve_url.trim() || null,
        google_map_url: form.google_map_url.trim() || null,
        lat,
        lng,
        image_url, // ← カバー画像
        instagram_url: form.instagram_url.trim() || null,
      })
      .eq('id', id)

    if (updateError) {
      console.error(updateError)
      setError('スポットの更新に失敗しました: ' + updateError.message)
      setSaving(false)
      return
    }

    router.push(`/spots/${id}`)
  }

  const handleDeleteSpot = async () => {
    if (!id) {
      setError('URL の id が不正です')
      return
    }

    const ok = window.confirm('このスポットを削除しますか？\nこの操作は元に戻せません。')
    if (!ok) return

    setError(null)
    setDeleting(true)

    try {
      const { error: deleteError } = await supabase.from('spots').delete().eq('id', id)
      if (deleteError) {
        console.error(deleteError)
        setError('スポットの削除に失敗しました: ' + deleteError.message)
        setDeleting(false)
        return
      }
      router.push('/spots')
    } catch (e) {
      console.error(e)
      setError('削除中にエラーが発生しました')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#374151] shadow">
        スポット情報を読み込み中…
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-[#B91C1C]">{error}</p>
        <Link
          href="/spots"
          className="text-xs text-[#6B7280] underline underline-offset-4 hover:text-[#111827]"
        >
          ← スポット一覧にもどる
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Link
        href={id ? `/spots/${id}` : '/spots'}
        className="text-xs text-[#6B7280] underline underline-offset-4 hover:text-[#111827]"
      >
        ← スポット詳細にもどる
      </Link>

      <h2 className="text-xl font-semibold text-[#111827]">スポット情報を編集</h2>
      <p className="text-xs text-[#6B7280]">
        管理者専用ページです。編集後は「保存する」を押して反映させてください。
      </p>

      {/* ▼ ギャラリー編集（spot_images） */}
      <section className="space-y-3 rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-md shadow-[#00000010]">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-[#111827]">ギャラリー画像（複数）</h3>
          {galleryLoading && <span className="text-[11px] text-[#6B7280]">読み込み中…</span>}
        </div>

        {/* 既存ギャラリー */}
        {gallery.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {gallery.map((img) => (
              <div key={img.id} className="relative overflow-hidden rounded-2xl border border-[#E5E7EB]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.image_url} alt="" className="h-28 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleDeleteGalleryImage(img.id)}
                  className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[10px] font-semibold text-white hover:bg-black"
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#6B7280]">まだギャラリー画像はありません。</p>
        )}

        {/* 追加アップロード */}
        <div className="space-y-2 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
          <label className="text-xs font-semibold text-[#374151]">画像を追加</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setGalleryFiles(Array.from(e.target.files ?? []))}
            className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-xs file:mr-3 file:rounded-lg file:border-none file:bg-[#EEF2FF] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-[#4F46E5]"
          />

          {/* 選択中プレビュー */}
          {previewUrls.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {previewUrls.map((u, idx) => (
                <div key={u} className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt={`preview-${idx}`} className="h-20 w-full object-cover" />
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleAddGalleryImages}
              disabled={galleryUploading || saving || deleting}
              className="inline-flex items-center justify-center rounded-full bg-[#22C55E] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-[#22C55E80] transition hover:bg-[#16A34A] disabled:opacity-60 disabled:shadow-none"
            >
              {galleryUploading ? 'アップロード中…' : '画像を追加アップロード'}
            </button>
            <button
              type="button"
              onClick={() => setGalleryFiles([])}
              disabled={galleryUploading}
              className="inline-flex items-center justify-center rounded-full bg-[#E5E7EB] px-4 py-2 text-xs font-semibold text-[#374151] hover:bg-[#D1D5DB] disabled:opacity-60"
            >
              選択をクリア
            </button>
          </div>

          <p className="text-[10px] text-[#9CA3AF]">
            ここで追加した画像はギャラリーとして保存されます（代表画像とは別）。
          </p>
        </div>
      </section>

      {/* ▼ スポット基本情報フォーム */}
      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-md shadow-[#00000010]"
      >
        {/* カバー画像 */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[#374151]">代表（カバー）画像</label>

          {existingCoverUrl && (
            <div className="mb-1 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={existingCoverUrl} alt={form.name || 'cover'} className="max-h-48 w-full object-cover" />
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
            className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-xs file:mr-3 file:rounded-lg file:border-none file:bg-[#EEF2FF] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-[#4F46E5]"
          />
          <p className="text-[10px] text-[#9CA3AF]">
            代表画像を差し替えたいときだけ選択してください。未選択なら現状維持です。
          </p>
        </div>

        {/* 以下はあなたのフォームをほぼそのまま */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-[#374151]">
            スポット名 <span className="text-[#DC2626]">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#374151]">エリア</label>
            <input
              type="text"
              value={form.area}
              onChange={(e) => handleChange('area', e.target.value)}
              className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
              placeholder="例：渋谷、新宿、横浜…"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#374151]">ジャンル（カンマ区切り）</label>
            <input
              type="text"
              value={form.genre}
              onChange={(e) => handleChange('genre', e.target.value)}
              className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
              placeholder="例：ランチ,カフェ,記念日用"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-[#374151]">住所</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => handleChange('address', e.target.value)}
            className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-[#374151]">説明</label>
          <textarea
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            className="h-24 w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
            placeholder="デートにおすすめなポイントや雰囲気など"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#374151]">予算</label>
            <input
              type="text"
              value={form.budget}
              onChange={(e) => handleChange('budget', e.target.value)}
              className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
              placeholder="例：¥3,000〜¥4,000 / 人"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#374151]">予約サイトURL</label>
            <input
              type="url"
              value={form.reserve_url}
              onChange={(e) => handleChange('reserve_url', e.target.value)}
              className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-[#374151]">GoogleマップURL</label>
          <input
            type="url"
            value={form.google_map_url}
            onChange={(e) => handleChange('google_map_url', e.target.value)}
            className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
            placeholder="https://maps.app.goo.gl/..."
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-[#374151]">インスタURL</label>
          <input
            type="url"
            placeholder="Instagram のURL (任意)"
            value={form.instagram_url}
            onChange={(e) => handleChange('instagram_url', e.target.value)}
            className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#374151]">緯度（lat）</label>
            <input
              type="text"
              value={form.lat}
              onChange={(e) => handleChange('lat', e.target.value)}
              className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
              placeholder="35.6..."
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#374151]">経度（lng）</label>
            <input
              type="text"
              value={form.lng}
              onChange={(e) => handleChange('lng', e.target.value)}
              className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
              placeholder="139.7..."
            />
          </div>
        </div>

        {error && <p className="text-xs text-[#B91C1C]">{error}</p>}

        <div className="pt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || deleting || galleryUploading}
              className="inline-flex items-center justify-center rounded-full bg-[#6366F1] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-[#6366F180] transition hover:bg-[#4F46E5] disabled:opacity-60 disabled:shadow-none"
            >
              {saving ? '保存中…' : '変更を保存する'}
            </button>

            <button
              type="button"
              onClick={() => router.push(id ? `/spots/${id}` : '/spots')}
              className="inline-flex items-center justify-center rounded-full bg-[#E5E7EB] px-4 py-2 text-xs font-semibold text-[#374151] hover:bg-[#D1D5DB]"
              disabled={saving || deleting || galleryUploading}
            >
              キャンセル
            </button>
          </div>

          <button
            type="button"
            onClick={handleDeleteSpot}
            disabled={saving || deleting || galleryUploading}
            className="inline-flex items-center justify-center rounded-full bg-[#F87171] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-[#DC262680] transition hover:bg-[#EF4444] disabled:opacity-60 disabled:shadow-none"
          >
            {deleting ? '削除中…' : 'このスポットを削除する'}
          </button>
        </div>
      </form>
    </div>
  )
}
