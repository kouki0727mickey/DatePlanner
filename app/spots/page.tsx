// app/spots/page.tsx
import { supabase } from '@/lib/supabaseClient'
import SpotsPageClient from './SpotsPageClient'

type Spot = {
  id: string
  name: string
  area: string | null
  address: string | null
  description: string | null
  image_url: string | null
}

export default async function SpotsPage() {
  const { data, error } = await supabase
    .from('spots')
    .select('id,name,area,address,description,image_url')
    .order('area', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    return (
      <div className="rounded-2xl border border-[#FCA5A5] bg-[#FEE2E2] px-4 py-3 text-sm text-[#7F1D1D] shadow-md shadow-[#FCA5A580]">
        Supabase エラー: {error.message}
      </div>
    )
  }

  const spots = (data ?? []) as Spot[]

  if (!spots.length) {
    return (
      <p className="text-sm text-[#4B5563]">
        まだスポットが登録されていません。
      </p>
    )
  }

  // 実際の表示・フィルタ処理はクライアント側に任せる
  return <SpotsPageClient spots={spots} />
}
