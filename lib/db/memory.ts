// lib/db/memory.ts
import { createServiceClient } from '@/lib/supabase'
import type { UserMemory } from '@/lib/supabase'

export async function getMemoriesForUser(userId: string): Promise<UserMemory[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return []
  }
  const db = createServiceClient()
  const { data, error } = await db
    .from('user_memories')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function upsertMemory(
  userId: string,
  key: string,
  value: string,
  category = 'general'
): Promise<UserMemory> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase not configured')
  }
  const db = createServiceClient()
  const { data, error } = await db
    .from('user_memories')
    .upsert(
      { user_id: userId, key, value, category, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,key' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteMemory(userId: string, memoryId: string): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase not configured')
  }
  const db = createServiceClient()
  const { error } = await db
    .from('user_memories')
    .delete()
    .eq('id', memoryId)
    .eq('user_id', userId)
  if (error) throw error
}

/** Format memories for injection into the system prompt */
export function formatMemoriesForPrompt(memories: UserMemory[]): string {
  if (memories.length === 0) return ''
  const lines = memories.map((m) => `- [${m.category}] ${m.key}: ${m.value}`)
  return `\n\n## Persistent Memory About This User:\n${lines.join('\n')}\n\nUse this context naturally in your responses. Do not explicitly mention that you have a memory system unless the user asks.`
}
