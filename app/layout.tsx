// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '今日のデートスポット',
  description: '二人で行きたいデートスポットを紹介するサイト',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-[#FFF7F0] text-[#374151]">
        {/* パステル背景 */}
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_#F9A8D455,_transparent_60%),radial-gradient(circle_at_bottom_right,_#A5B4FC55,_transparent_60%),radial-gradient(circle_at_bottom_left,_#FDE68A55,_transparent_60%)]" />

        <div className="relative mx-auto flex min-h-screen max-w-4xl flex-col px-4 pb-12 pt-8">
          <header className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-[#111827]">
                今日のデートスポット
              </h1>
              <p className="text-xs text-[#6B7280]">
                二人で行きたい場所をさがして、記録していこう
              </p>
            </div>

            <nav className="flex gap-3 text-sm font-medium">
              <a
                href="/spots"
                className="rounded-full bg-white px-3 py-1 text-[#111827] shadow-sm shadow-[#00000012] border border-[#E5E7EB] hover:bg-[#FEF3C7]"
              >
                スポット一覧
              </a>
              <a
                href="/mypage"
                className="rounded-full bg-white px-3 py-1 text-[#111827] shadow-sm shadow-[#00000012] border border-[#E5E7EB] hover:bg-[#E0F2FE]"
              >
                マイページ
              </a>
              <a
                href="/login"
                className="rounded-full bg-white px-3 py-1 text-[#111827] shadow-sm shadow-[#00000012] border border-[#E5E7EB] hover:bg-[#FFE4E6]"
              >
                ログイン
              </a>
            </nav>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="mt-12 text-center text-xs text-[#6B7280]">
            &copy; {new Date().getFullYear()} 今日のデートスポット
          </footer>
        </div>
      </body>
    </html>
  )
}
