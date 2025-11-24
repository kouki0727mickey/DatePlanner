// app/login/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type UserInfo = {
  id: string
  email?: string
}

export default function LoginPage() {
  const [blocked, setBlocked] = useState(false)
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
        const ua = navigator.userAgent.toLowerCase()

    if (ua.includes('line/')) {
      setBlocked(true)
    }
    const loadUser = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

    if (error && !error.message.includes('Auth session missing')) {
        console.error(error)
        setError(error.message)
      } else if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? undefined,
        })
      }

      setLoading(false)
    }

    loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? undefined,
        })
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLoginWithGoogle = async () => {
    setError(null)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/login`,
      },
    })

    // 「Auth session missing」は「すでにセッションが無いだけ」なのでエラー扱いしない
    if (error && !error.message.includes('Auth session missing')) {
      console.error(error)
      setError(error.message)
    }
  }

  const handleLogout = async () => {
    setError(null)
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error(error)
      setError(error.message)
      return
    }
    setUser(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <div className="rounded-2xl border border-[#E5E7EB] bg-white px-6 py-4 text-sm text-[#374151] shadow-md shadow-[#00000010]">
          ログイン状態を確認中…
        </div>
      </div>
    )
  }

  if (blocked) {
          return (
        <div className="p-6 text-center space-y-4">
          <h2 className="text-lg font-bold text-[#111827]">
            LINEアプリ内ブラウザではログインできません
          </h2>

          <p className="text-sm text-[#4B5563]">
            Googleログインを使うためには、外部ブラウザでこのページを開く必要があります。
          </p>

          <ul className="text-xs text-left text-[#6B7280] space-y-1 max-w-xs mx-auto">
            <li>① 画面右上の「︙」または「⋯」をタップ</li>
            <li>② 「他のアプリで開く」または「Safariで開く / Chromeで開く」を選択</li>
          </ul>

          <p className="text-[11px] text-[#9CA3AF]">
            ※ LINE からはアプリ側で外部ブラウザを自動で開くことができません
          </p>
        </div>
      )
    }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <Link
        href="/"
        className="text-xs text-[#6B7280] underline underline-offset-4 hover:text-[#111827]"
      >
        ← トップにもどる
      </Link>

      <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-lg shadow-[#00000010]">
        <h2 className="mb-2 text-xl font-semibold text-[#111827]">
          アカウント / ログイン
        </h2>
        <p className="mb-4 text-xs text-[#6B7280]">
          ログインすると、「行った！」の履歴をマイページで振り返れます。
        </p>

        {error && (
          <div className="mb-3 rounded-xl border border-[#FCA5A5] bg-[#FEE2E2] px-3 py-2 text-xs text-[#7F1D1D]">
            {error}
          </div>
        )}

        {user ? (
          <div className="space-y-4">
            <div className="space-y-1 rounded-xl border border-[#E5E7EB] bg-[#FFF7F0] p-3 text-xs text-[#374151]">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                現在ログイン中
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

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex w-full items-center justify-center rounded-full border border-[#FCA5A5] bg-white px-4 py-2 text-xs font-semibold text-[#7F1D1D] shadow-sm shadow-[#FCA5A580] transition hover:bg-[#FEE2E2]"
            >
              ログアウトする
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleLoginWithGoogle}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#6366F1] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-[#6366F180] transition hover:bg-[#4F46E5]"
            >
              Google でログインする
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
