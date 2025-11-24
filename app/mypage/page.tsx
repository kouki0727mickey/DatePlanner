// app/mypage/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type ShopSummary = {
  id: string
  name: string
  area: string | null
  address: string | null
}

type VisitWithSpot = {
  id: string
  created_at: string
  spot: ShopSummary | null
}

type UserInfo = {
  id: string
  email?: string
}

export default function MyPage() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [userError, setUserError] = useState<string | null>(null)

  const [visits, setVisits] = useState<VisitWithSpot[]>([])
  const [visitsLoading, setVisitsLoading] = useState(false)
  const [visitsError, setVisitsError] = useState<string | null>(null)

  useEffect(() => {
    const loadUserAndVisits = async () => {
      setUserLoading(true)
      setUserError(null)

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error) {
        console.error(error)
        setUserError(error.message)
        setUserLoading(false)
        return
      }

      if (!session?.user) {
        setUser(null)
        setUserLoading(false)
        return
      }

      const currentUser: UserInfo = {
        id: session.user.id,
        email: session.user.email ?? undefined,
      }

      setUser(currentUser)
      setUserLoading(false)

      setVisitsLoading(true)
      setVisitsError(null)

      const { data, error: visitsErr } = await supabase
        .from('visits')
        .select('id, created_at, spot:spots ( id, name, area, address )')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })

      if (visitsErr) {
        console.error(visitsErr)
        setVisitsError(visitsErr.message)
        setVisitsLoading(false)
        return
      }

      type VisitQueryResult = {
        id: string
        created_at: string
        spot:
          | { id: string; name: string; area: string | null; address: string | null }
          | { id: string; name: string; area: string | null; address: string | null }[]
          | null
      }

      const raw = (data ?? []) as VisitQueryResult[]

      const normalized: VisitWithSpot[] = raw.map((row) => {
        let spot: ShopSummary | null = null

        if (row.spot) {
          const s = Array.isArray(row.spot) ? row.spot[0] : row.spot
          if (s) {
            spot = {
              id: s.id,
              name: s.name,
              area: s.area,
              address: s.address,
            }
          }
        }

        return {
          id: row.id,
          created_at: row.created_at,
          spot,
        }
      })

      setVisits(normalized)
      setVisitsLoading(false)
    }

    loadUserAndVisits()
  }, [])

  if (userLoading) {
    return (
      <div className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#374151] shadow-md shadow-[#00000010]">
        ログイン状態を確認中…
      </div>
    )
  }

  if (userError) {
    return (
      <div className="space-y-3">
        <Link
          href="/"
          className="text-xs text-[#6B7280] underline underline-offset-4 hover:text-[#111827]"
        >
          ← トップにもどる
        </Link>
        <div className="rounded-2xl border border-[#FCA5A5] bg-[#FEE2E2] px-4 py-3 text-sm text-[#7F1D1D] shadow-md shadow-[#FCA5A580]">
          ログイン情報の取得に失敗しました: {userError}
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <Link
          href="/"
          className="text-xs text-[#6B7280] underline underline-offset-4 hover:text-[#111827]"
        >
          ← トップにもどる
        </Link>

        <div className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-lg shadow-[#00000010]">
          <h2 className="mb-2 text-xl font-semibold text-[#111827]">
            マイページ
          </h2>
          <p className="mb-4 text-sm text-[#4B5563]">
            マイページを表示するには、ログインが必要です。
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full bg-[#6366F1] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-[#6366F180] transition hover:bg-[#4F46E5]"
          >
            ログインページへ
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="text-xs text-[#6B7280] underline underline-offset-4 hover:text-[#111827]"
        >
          ← トップにもどる
        </Link>
        <Link
          href="/login"
          className="text-xs text-[#6B7280] underline underline-offset-4 hover:text-[#111827]"
        >
          ログイン状態の確認 / ログアウト
        </Link>
      </div>

      {/* ユーザー情報 */}
      <section className="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-md shadow-[#00000010]">
        <h2 className="mb-2 text-xl font-semibold text-[#111827]">
          マイページ
        </h2>
        <div className="mb-3 text-xs text-[#6B7280]">
          二人で行ったデートスポットの足跡。
        </div>

        <div className="space-y-1 rounded-xl border border-[#E5E7EB] bg-[#FFF7F0] p-3 text-xs text-[#374151]">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
            ユーザー情報
          </div>
          <div>
            <span className="text-[#9CA3AF]">ID:</span>
            <span className="ml-1 font-mono break-all text-[#111827]">
              {user.id}
            </span>
          </div>
          <div>
            <span className="text-[#9CA3AF]">Email:</span>
            <span className="ml-1 text-[#111827]">
              {user.email ?? '（なし）'}
            </span>
          </div>
        </div>
      </section>

      {/* 行ったスポット履歴 */}
      <section className="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-md shadow-[#00000010]">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#111827]">
            行ったデートスポット履歴
          </h3>
          {!visitsLoading && !visitsError && (
            <span className="text-[11px] text-[#6B7280]">
              合計{' '}
              <span className="font-semibold text-[#6366F1]">
                {visits.length}
              </span>{' '}
              件
            </span>
          )}
        </div>

        {visitsLoading && (
          <p className="text-xs text-[#4B5563]">
            履歴を読み込み中…
          </p>
        )}

        {visitsError && (
          <p className="text-xs text-[#B91C1C]">
            履歴の取得に失敗しました: {visitsError}
          </p>
        )}

        {!visitsLoading && !visitsError && visits.length === 0 && (
          <p className="text-xs text-[#6B7280]">
            まだ「行った！」が登録されていません。  
            気になるスポットを探して、最初のデートを記録しよう。
          </p>
        )}

        {!visitsLoading && !visitsError && visits.length > 0 && (
          <ul className="mt-3 space-y-3">
            {visits.map((visit) => {
              const spot = visit.spot
              const dateStr = new Date(visit.created_at).toLocaleString('ja-JP')
              return (
                <li
                  key={visit.id}
                  className="flex flex-col gap-1 rounded-2xl border border-[#E5E7EB] bg-[#FFF7F0] p-3 text-xs text-[#374151] shadow-sm shadow-[#00000008]"
                >
                  {spot ? (
                    <Link
                      href={`/spots/${spot.id}`}
                      className="font-semibold text-[#111827] underline underline-offset-4 hover:text-[#6366F1]"
                    >
                      {spot.name}
                    </Link>
                  ) : (
                    <div className="font-semibold text-[#9CA3AF]">
                      （スポット情報なし）
                    </div>
                  )}

                  {spot && (
                    <div className="text-[11px] text-[#6B7280]">
                      {spot.area ? `${spot.area} / ` : ''}
                      {spot.address}
                    </div>
                  )}

                  <div className="text-[11px] text-[#9CA3AF]">
                    行った日: {dateStr}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
