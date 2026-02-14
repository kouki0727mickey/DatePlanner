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

type UploadedImage = {
  url: string
  path: string
}

export default function NewSpotPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // ✅ 複数画像ファイル用
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])

  // ✅ 代表画像にするindex（spots.image_urlに保存する）
  const [coverIndex, setCoverIndex] = useState(0)

  // （あなたの元コードに合わせて残す）
  const [instagramUrl, setInstagramUrl] = useState('')

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

  // ✅ 複数画像選択（追加選択OK / 最大10枚）
  const handlePickImages = (files: FileList | null) => {
    if (!files) return

    // 追加選択した分も取り込む
    const selected = Array.from(files)

    // 最大10枚に制限（不要なら数字を変える／削除してOK）
    const merged = [...imageFiles, ...selected].slice(0, 10)
    setImageFiles(merged)

    // プレビュー更新（objectURL）
    const nextPreviews = merged.map((f) => URL.createObjectURL(f))
    setPreviews(nextPreviews)

    // coverIndexが範囲外にならないよう補正
    setCoverIndex((idx) => Math.min(idx, Math.max(0, merged.length - 1)))
  }

  // ✅ 選択済み画像を削除
  const removeImageAt = (index: number) => {
    const nextFiles = imageFiles.filter((_, i) => i !== index)
    setImageFiles(nextFiles)

    const nextPreviews = previews.filter((_, i) => i !== index)
    setPreviews(nextPreviews)

    // coverIndex調整
    setCoverIndex((idx) => {
      if (nextFiles.length === 0) return 0
      if (index === idx) return 0
      if (index < idx) return idx - 1
      return Math.min(idx, nextFiles.length - 1)
    })
  }

  // ✅ 画像1枚をStorageへアップロードして public URL を返す
  const uploadOne = async (file: File): Promise<UploadedImage> => {
    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`
    const filePath = `spots/${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('Pictures') // bucket 名（editと同じ）
      .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data: publicUrlData } = supabase.storage
      .from('Pictures')
      .getPublicUrl(uploadData.path)

    return {
      url: publicUrlData.publicUrl,
      path: uploadData.path,
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.name.trim()) {
      setError('スポット名は必須です')
      return
    }

    setSaving(true)

    try {
      // ① 複数画像をアップロード（選択が無ければ空）
      const uploaded: UploadedImage[] = []
      for (const f of imageFiles) {
        const u = await uploadOne(f)
        uploaded.push(u)
      }

      // ② 代表画像URL（spots.image_url）を決定
      //    代表が選ばれていればそれ / 未選択ならnull
      const coverUrl =
        uploaded.length > 0
          ? uploaded[Math.min(coverIndex, uploaded.length - 1)].url
          : null

      // ③ spots を insert（戻り値で id を得る）
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
          image_url: coverUrl, // ✅ 代表画像（なければnull）
          instagram_url: instagramUrl || null,
        })
        .select('id')
        .maybeSingle()

      if (error) {
        console.error(error)
        setError('スポットの登録に失敗しました: ' + error.message)
        setSaving(false)
        return
      }

      const spotId = data?.id as string | undefined
      if (!spotId) {
        setError('スポットIDの取得に失敗しました')
        setSaving(false)
        return
      }

      // ④ spot_images に複数枚登録（sort_orderは選択順）
      if (uploaded.length > 0) {
        const rows = uploaded.map((u, idx) => ({
          spot_id: spotId,
          image_url: u.url,
          sort_order: idx,
        }))

        const { error: imgErr } = await supabase.from('spot_images').insert(rows)
        if (imgErr) {
          console.error(imgErr)
          setError('ギャラリー画像の登録に失敗しました: ' + imgErr.message)
          setSaving(false)
          return
        }
      }

      // ✅ 完了 → 詳細へ
      router.push(`/spots/${spotId}`)
    } catch (err: any) {
      console.error(err)
      setError(err?.message ? `保存に失敗しました: ${err.message}` : '保存に失敗しました')
      setSaving(false)
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
    <div className="mx-auto w-full max-w-2xl space-y-4 px-3 pb-10 sm:px-0">
      <h2 className="text-xl font-semibold text-[#111827]">新規デートスポット登録</h2>
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
          <label className="text-xs font-semibold text-[#374151]">住所</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => handleChange('address', e.target.value)}
            className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
          />
        </div>

        {/* 説明 */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-[#374151]">説明</label>
          <textarea
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            className="h-24 w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
            placeholder="デートにおすすめなポイントや雰囲気など"
          />
        </div>

        {/* ✅ 複数画像アップロード */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[#374151]">
            ギャラリー画像（複数）
          </label>

          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handlePickImages(e.target.files)}
            className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-xs file:mr-3 file:rounded-lg file:border-none file:bg-[#EEF2FF] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-[#4F46E5]"
          />

          <p className="text-[10px] text-[#9CA3AF]">
            複数枚アップロードできます（最大10枚）。タップで代表画像を選べます。
          </p>

          {previews.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-[#6B7280]">代表画像を選択</div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {previews.map((src, idx) => (
                  <div key={src + idx} className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setCoverIndex(idx)}
                      className={`overflow-hidden rounded-2xl border bg-white ${
                        coverIndex === idx ? 'border-[#6366F1]' : 'border-[#E5E7EB]'
                      }`}
                      title="タップで代表画像に設定"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="h-24 w-36 object-cover" />
                    </button>

                    <button
                      type="button"
                      onClick={() => removeImageAt(idx)}
                      className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-semibold text-white"
                      title="削除"
                    >
                      ✕
                    </button>

                    {coverIndex === idx && (
                      <div className="mt-1 text-center text-[10px] font-semibold text-[#4F46E5]">
                        代表
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 予算・予約・インスタ */}
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

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#374151]">インスタURL</label>
            <input
              type="url"
              placeholder="Instagram のURL (任意)"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
            />
          </div>
        </div>

        {/* マップ */}
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

        {/* 緯度・経度 */}
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
