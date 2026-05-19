import { Suspense } from "react";
import { supabase } from "@/lib/supabaseClient";
import SpotsClient from "./SpotsClient";

// 常に最新データを取得するため動的レンダリングに設定
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

  return (
    <Suspense fallback={
      <div style={{ maxWidth: 1100, margin: "60px auto", textAlign: "center", color: "var(--muted)" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid var(--gold)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <SpotsClient spots={(spots as Spot[]) ?? []} />
    </Suspense>
  );
}
