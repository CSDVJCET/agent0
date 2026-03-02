// lib/db/sessions.ts
import { createServiceClient } from '@/lib/supabase'
import type { ChatSession } from '@/lib/supabase'

/** Upsert the Clerk user into the users table before any session ops */
export async function ensureUser(userId: string, email?: string | null) {
  const db = createServiceClient()
  await db.from('users').upsert(
    { id: userId, email: email ?? null, updated_at: new Date().toISOString() },
    { onConflict: 'id', ignoreDuplicates: false }
  )
}

export async function createSession(userId: string, modelId?: string): Promise<ChatSession> {
  const db = createServiceClient()
  const { data, error } = await db
    .from('chat_sessions')
    .insert({ user_id: userId, title: 'New Chat', model_id: modelId ?? null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getSessionsForUser(userId: string, limit = 20): Promise<ChatSession[]> {
  const db = createServiceClient()
  const { data, error } = await db
    .from('chat_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function updateSessionTitle(sessionId: string, userId: string, title: string) {
  const db = createServiceClient()
  const { error } = await db
    .from('chat_sessions')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function deleteSession(sessionId: string, userId: string) {
  const db = createServiceClient()
  const { error } = await db
    .from('chat_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userId)
  if (error) throw error
}
