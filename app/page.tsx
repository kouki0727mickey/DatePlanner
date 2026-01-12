// app/page.tsx
import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-col gap-6 rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-lg shadow-[#00000010]">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-[#111827]">
          今日、どこにデートしに行く？
        </h2>
        <p className="text-sm text-[#4B5563]">
          雰囲気のいいカフェ、夜景、水族館…。  
          気になるスポットを見つけて、実際に行ったら記録していこう。
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/spots"
          className="flex flex-col justify-between rounded-2xl bg-[#6366F1] px-4 py-3 text-sm font-semibold text-white shadow-md shadow-[#6366F180] transition hover:-translate-y-0.5 hover:bg-[#4F46E5]"
        >
          <span>スポット一覧から探す</span>
          <span className="text-xs opacity-90">
            エリア別にデートスポットをチェック
          </span>
        </Link>

        <Link
          href="/plan"
          className="flex flex-col justify-between rounded-2xl bg-[#EEF2FF] px-4 py-3 text-sm font-semibold text-[#3730A3] shadow-md hover:bg-[#E0E7FF]"
        >
          <span>プランを自動生成する</span>
          <span className="text-xs text-[#6B7280]">エリアを選んで一発でデートコース</span>
        </Link>


        <Link
          href="/mypage"
          className="flex flex-col justify-between rounded-2xl bg-white px-4 py-3 text-sm text-[#111827] shadow-md shadow-[#00000010] border border-[#E5E7EB] transition hover:-translate-y-0.5 hover:bg-[#E0F2FE]"
        >
          <span>マイページ</span>
          <span className="text-xs text-[#6B7280]">
            二人で行った場所の履歴を振り返る
          </span>
        </Link>

        <Link
          href="/login"
          className="flex flex-col justify-between rounded-2xl border border-[#F9A8D4] bg-[#FDF2F8] px-4 py-3 text-sm text-[#9D174D] shadow-md shadow-[#F9A8D480] transition hover:-translate-y-0.5 hover:bg-[#FCE7F3]"
        >
          <span>ログイン / アカウント</span>
          <span className="text-xs text-[#6B7280]">
            Google アカウントでかんたんログイン
          </span>
        </Link>
      </div>
    </div>
  )
}
