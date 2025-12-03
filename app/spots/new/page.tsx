// app/spots/new/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { ADMIN_EMAILS } from '@/config/admin'


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

export default function NewSpotPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // 画像ファイル用
  const [imageFile, setImageFile] = useState<File | null>(null)

  const [instagramUrl, setInstagramUrl] = useState("");
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
    const checkAdmin = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error) {
        console.error(error)
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
      setLoading(false)
    }

    checkAdmin()
  }, [router])

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.name.trim()) {
      setError('スポット名は必須です')
      return
    }

    setSaving(true)

    // ① 画像があれば先に Storage にアップロード
    let image_url: string | null = null

    if (imageFile) {
      try {
        const ext = imageFile.name.split('.').pop() || 'jpg'
        const fileName = `${Date.now()}.${ext}`
        const filePath = `spots/${fileName}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('Pictures') // ← 作成した bucket 名
          .upload(filePath, imageFile)

        if (uploadError) {
          console.error(uploadError)
          setError('画像のアップロードに失敗しました: ' + uploadError.message)
          setSaving(false)
          return
        }

        const { data: publicUrlData } = supabase.storage
          .from('Pictures')
          .getPublicUrl(uploadData.path)

        image_url = publicUrlData.publicUrl
      } catch (err) {
        console.error(err)
        setError('画像のアップロード中にエラーが発生しました')
        setSaving(false)
        return
      }
    }

    // ② スポット本体を登録
    const lat = form.lat ? Number(form.lat) : null
    const lng = form.lng ? Number(form.lng) : null

    const { data, error } = await supabase
      .from('spots')
      .insert({
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
        image_url, // ← ここで紐づけ
        instagram_url: instagramUrl, 
      })
      .select('id')
      .maybeSingle()

    if (error) {
      console.error(error)
      setError('スポットの登録に失敗しました: ' + error.message)
      setSaving(false)
      return
    }

    if (data?.id) {
      router.push(`/spots/${data.id}`)
    } else {
      router.push('/spots')
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#374151] shadow">
        権限を確認中…
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-[#B91C1C]">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-[#111827]">
        新規デートスポット登録
      </h2>
      <p className="text-xs text-[#6B7280]">
        管理者専用。最低限「スポット名」だけ入れておけば、あとから編集する運用でもOKです。
      </p>

      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-md shadow-[#00000010]"
      >

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
            placeholder="例：渋谷スカイ、恵比寿ガーデンプレイス など"
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

                {/* 画像アップロード */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-[#374151]">
            イメージ画像
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              setImageFile(e.target.files?.[0] ?? null)
            }
            className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-xs file:mr-3 file:rounded-lg file:border-none file:bg-[#EEF2FF] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-[#4F46E5]"
          />
          <p className="text-[10px] text-[#9CA3AF]">
            JPG / PNG など、1枚だけアップロードできます。
          </p>
        </div>

        {/* 予算・予約・マップ・インスタリンク */}
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
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#374151]">
              インスタURL
            </label>
            <input
              type="url"
              placeholder="Instagram のURL (任意)"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
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

        {/* 緯度・経度（任意） */}
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

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-full bg-[#6366F1] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-[#6366F180] transition hover:bg-[#4F46E5] disabled:opacity-60 disabled:shadow-none"
          >
            {saving ? '登録中…' : 'スポットを登録する'}
          </button>
        </div>
      </form>
    </div>
  )
}
