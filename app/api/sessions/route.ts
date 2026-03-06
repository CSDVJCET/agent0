// app/api/sessions/route.ts
import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { ensureUser, createSession, getSessionsForUser } from '@/lib/db/sessions'
import { isSupabaseConfigured } from '@/lib/supabase'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Supabase not configured — return empty list instead of crashing
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ sessions: [] })
  }

  try {
    const sessions = await getSessionsForUser(userId)
    return NextResponse.json({ sessions })
  } catch (e) {
    console.error('Failed to fetch sessions:', e)
    return NextResponse.json({ sessions: [] })
  }
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Supabase not configured — return a transient local session instead of crashing
  if (!isSupabaseConfigured()) {
    const localSession = {
      id: `local-${Date.now()}`,
      user_id: userId,
      title: 'New Chat',
      model_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    return NextResponse.json({ session: localSession })
  }

  const user = await currentUser()
  await ensureUser(userId, user?.emailAddresses[0]?.emailAddress).catch((e) =>
    console.error('ensureUser failed (non-fatal):', e)
  )

  try {
    const body = await req.json().catch(() => ({}))
    const session = await createSession(userId, body.modelId)
    return NextResponse.json({ session })
  } catch (e) {
    console.error('Failed to create session:', e)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}
