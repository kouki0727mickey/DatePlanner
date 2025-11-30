// app/spots/[id]/edit/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

// 編集を許可するメールアドレス
const ADMIN_EMAILS = ['kouki0727mickey@gmail.com'] as const // ← あなたのメールに変更

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
  image_url: string | null
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
}

export default function EditSpotPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params?.id

  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
  })

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setError('URL の id が不正です')
        setLoading(false)
        return
      }

      // 1. ログイン & 管理者チェック
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

      // 2. 対象スポットのロード
      const { data, error } = await supabase
        .from('spots')
        .select(
          'id,name,area,genre,address,description,budget,reserve_url,google_map_url,lat,lng,image_url'
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
      })
      setExistingImageUrl(spot.image_url ?? null)
      setLoading(false)
    }

    load()
  }, [id, router])

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

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

    // 画像URL（既存 or 新規アップロード）
    let image_url: string | null = existingImageUrl

    // 新しい画像が選択されている場合だけアップロード
    if (imageFile) {
      try {
        const ext = imageFile.name.split('.').pop() || 'jpg'
        const fileName = `${Date.now()}.${ext}`
        const filePath = `spots/${fileName}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('spots-images') // bucket 名
          .upload(filePath, imageFile)

        if (uploadError) {
          console.error(uploadError)
          setError('画像のアップロードに失敗しました: ' + uploadError.message)
          setSaving(false)
          return
        }

        const { data: publicUrlData } = supabase.storage
          .from('spots-images')
          .getPublicUrl(uploadData.path)

        image_url = publicUrlData.publicUrl
      } catch (err) {
        console.error(err)
        setError('画像のアップロード中にエラーが発生しました')
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
        image_url,
      })
      .eq('id', id)

    if (updateError) {
      console.error(updateError)
      setError('スポットの更新に失敗しました: ' + updateError.message)
      setSaving(false)
      return
    }

    // 保存完了 → 詳細ページへ戻る
    router.push(`/spots/${id}`)
  }

    const handleDelete = async () => {
    if (!id) {
      setError('URL の id が不正です')
      return
    }

    const ok = window.confirm(
      'このスポットを削除しますか？\nこの操作は元に戻せません。'
    )
    if (!ok) return

    setError(null)
    setDeleting(true)

    try {
      // 関連テーブルに外部キー制約がある場合は
      // DB 側で ON DELETE CASCADE を設定しておくと楽です
      const { error: deleteError } = await supabase
        .from('spots')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error(deleteError)
        setError('スポットの削除に失敗しました: ' + deleteError.message)
        setDeleting(false)
        return
      }

      // 削除成功 → 一覧へ
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

      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-md shadow-[#00000010]"
      >
        {/* 画像（プレビュー + アップロード） */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[#374151]">
            イメージ画像
          </label>

          {existingImageUrl && (
            <div className="mb-1 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={existingImageUrl}
                alt={form.name || 'spot image'}
                className="max-h-48 w-full object-cover"
              />
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-xs file:mr-3 file:rounded-lg file:border-none file:bg-[#EEF2FF] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-[#4F46E5]"
          />
          <p className="text-[10px] text-[#9CA3AF]">
            新しい画像を選ぶと差し替えられます。未選択の場合は現在の画像のままです。
          </p>
        </div>

        {/* 名前 */}
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

        {/* エリア & ジャンル */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#374151]">
              エリア
            </label>
            <input
              type="text"
              value={form.area}
              onChange={(e) => handleChange('area', e.target.value)}
              className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
              placeholder="例：渋谷、新宿、横浜…"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#374151]">
              ジャンル（カンマ区切り）
            </label>
            <input
              type="text"
              value={form.genre}
              onChange={(e) => handleChange('genre', e.target.value)}
              className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
              placeholder="例：ランチ,カフェ,記念日用"
            />
          </div>
        </div>

        {/* 住所 */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-[#374151]">
            住所
          </label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => handleChange('address', e.target.value)}
            className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
          />
        </div>

        {/* 説明 */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-[#374151]">
            説明
          </label>
          <textarea
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            className="h-24 w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
            placeholder="デートにおすすめなポイントや雰囲気など"
          />
        </div>

        {/* 予算・予約・マップリンク */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#374151]">
              予算
            </label>
            <input
              type="text"
              value={form.budget}
              onChange={(e) => handleChange('budget', e.target.value)}
              className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
              placeholder="例：¥3,000〜¥4,000 / 人"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#374151]">
              予約サイトURL
            </label>
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
          <label className="text-xs font-semibold text-[#374151]">
            GoogleマップURL
          </label>
          <input
            type="url"
            value={form.google_map_url}
            onChange={(e) => handleChange('google_map_url', e.target.value)}
            className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
            placeholder="https://maps.app.goo.gl/..."
          />
        </div>

        {/* 緯度・経度 */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#374151]">
              緯度（lat）
            </label>
            <input
              type="text"
              value={form.lat}
              onChange={(e) => handleChange('lat', e.target.value)}
              className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
              placeholder="35.6..."
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#374151]">
              経度（lng）
            </label>
            <input
              type="text"
              value={form.lng}
              onChange={(e) => handleChange('lng', e.target.value)}
              className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
              placeholder="139.7..."
            />
          </div>
        </div>

        {error && (
          <p className="text-xs text-[#B91C1C]">{error}</p>
        )}

        <div className="pt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
            <button
            type="submit"
            disabled={saving || deleting}
            className="inline-flex items-center justify-center rounded-full bg-[#6366F1] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-[#6366F180] transition hover:bg-[#4F46E5] disabled:opacity-60 disabled:shadow-none"
            >
            {saving ? '保存中…' : '変更を保存する'}
            </button>

            <button
            type="button"
            onClick={() => router.push(id ? `/spots/${id}` : '/spots')}
            className="inline-flex items-center justify-center rounded-full bg-[#E5E7EB] px-4 py-2 text-xs font-semibold text-[#374151] hover:bg-[#D1D5DB]"
            disabled={saving || deleting}
            >
            キャンセル
            </button>
        </div>

        {/* 削除ボタン */}
        <button
            type="button"
            onClick={handleDelete}
            disabled={saving || deleting}
            className="inline-flex items-center justify-center rounded-full bg-[#F87171] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-[#DC262680] transition hover:bg-[#EF4444] disabled:opacity-60 disabled:shadow-none"
        >
            {deleting ? '削除中…' : 'このスポットを削除する'}
        </button>
        </div>

      </form>
    </div>
  )
}
