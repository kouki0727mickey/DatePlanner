// app/spots/page.tsx
// ★ Supabase fetch ロジックは既存コードから変更しない
//   このファイルでは UI のみ差し替え。
//   既存コードの createClient / fetchSpots / Spot 型定義をそのまま維持すること。

import { supabase } from "@/lib/supabaseClient";
import SpotsClient from "./SpotsClient";

export type Spot = {
  id: string;
  name: string;
  area: string;
  genre: string;
  address: string;
  description: string;
  image_url?: string;
};

export default async function SpotsPage() {
  const { data: spots } = await supabase
    .from("spots")
    .select("*")
    .order("area");

  return <SpotsClient spots={(spots as Spot[]) ?? []} />;
}
