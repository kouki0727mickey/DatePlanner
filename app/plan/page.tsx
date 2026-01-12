// app/plan/page.tsx
export const dynamic = 'force-dynamic' // 追加/編集を即反映したいので

import { supabase } from '@/lib/supabaseClient'
import PlanPageClient from './PlanPageClient'

export type Spot = {
  id: string
  name: string
  area: string | null
  genre: string | null
  address: string | null
  description: string | null
  image_url: string | null
  budget: string | null
  reserve_url: string | null
  google_map_url: string | null
}

export default async function PlanPage() {
  const { data, error } = await supabase
    .from('spots')
    .select('id,name,area,genre,address,description,image_url,budget,reserve_url,google_map_url')
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

  return <PlanPageClient spots={spots} />
}
