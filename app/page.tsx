'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Post = {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: { username: string }[] | null
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  const fetchPosts = useCallback(async () => {
    const { data } = await supabase
      .from('posts')
      .select('id, content, created_at, user_id, profiles!posts_user_id_profiles_fkey(username)')
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setPosts(data as unknown as Post[])
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    fetchPosts()

    const channel = supabase
      .channel('posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => {
        fetchPosts()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchPosts])

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || !user) return
    setPosting(true)
    await supabase.from('posts').insert({ content: content.trim(), user_id: user.id })
    setContent('')
    setPosting(false)
    fetchPosts()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* ヘッダー */}
      <header className="sticky top-0 bg-black/80 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center justify-between z-10">
        <h1 className="text-xl font-bold">X Clone</h1>
        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 truncate max-w-32">{user.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap"
            >
              ログアウト
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <Link href="/login" className="text-sm text-blue-400 hover:text-blue-300">
              ログイン
            </Link>
            <Link href="/register" className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-full transition-colors">
              登録
            </Link>
          </div>
        )}
      </header>

      {/* 投稿フォーム */}
      {user && (
        <div className="border-b border-gray-800 px-4 py-4">
          <form onSubmit={handlePost}>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="今何してる？"
              maxLength={280}
              rows={3}
              className="w-full bg-transparent text-white placeholder-gray-500 resize-none outline-none text-lg"
            />
            <div className="flex items-center justify-between mt-3">
              <span className={`text-sm ${content.length > 250 ? 'text-red-400' : 'text-gray-500'}`}>
                {280 - content.length}
              </span>
              <button
                type="submit"
                disabled={!content.trim() || posting}
                className="bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-5 py-2 rounded-full transition-colors"
              >
                {posting ? '投稿中...' : '投稿'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* フィード */}
      <div>
        {posts.length === 0 && (
          <div className="text-center text-gray-600 py-20">
            まだ投稿がない
          </div>
        )}
        {posts.map(post => (
          <article
            key={post.id}
            className="border-b border-gray-800 px-4 py-4 hover:bg-gray-900/50 transition-colors"
          >
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                {post.profiles?.[0]?.username?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-bold text-sm">
                    {post.profiles?.[0]?.username ?? '不明'}
                  </span>
                  <span className="text-gray-500 text-xs">
                    {new Date(post.created_at).toLocaleString('ja-JP', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {post.content}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
