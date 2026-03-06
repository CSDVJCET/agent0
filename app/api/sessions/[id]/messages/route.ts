// app/api/sessions/[id]/messages/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getMessagesForSession, saveMessages } from '@/lib/db/messages'
import { isSupabaseConfigured } from '@/lib/supabase'
import type { MyUIMessage } from '@/types/chat'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ messages: [] })
  }

  const { id } = await params
  try {
    const messages = await getMessagesForSession(id, userId)
    return NextResponse.json({ messages })
  } catch (e) {
    console.error('Failed to fetch messages:', e)
    return NextResponse.json({ messages: [] })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true })
  }

  const { id } = await params
  try {
    const { messages } = await req.json() as { messages: MyUIMessage[] }
    await saveMessages(id, userId, messages)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Failed to save messages:', e)
    return NextResponse.json({ error: 'Failed to save messages' }, { status: 500 })
  }
}
