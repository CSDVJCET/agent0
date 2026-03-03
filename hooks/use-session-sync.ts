// hooks/use-session-sync.ts
'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import type { MyUIMessage } from '@/types/chat'

export interface ChatSessionSummary {
  id: string
  title: string
  updated_at: string
  model_id: string | null
}

interface UseSessionSyncProps {
  messages: MyUIMessage[]
  setMessages: (msgs: MyUIMessage[]) => void
  currentSessionId: string | null
  setCurrentSessionId: (id: string | null) => void
  sessions: ChatSessionSummary[]
  setSessions: (s: ChatSessionSummary[]) => void
  setIsLoaded: (b: boolean) => void
}

export function useSessionSync({
  messages,
  setMessages,
  currentSessionId,
  setCurrentSessionId,
  sessions,
  setSessions,
  setIsLoaded,
}: UseSessionSyncProps) {
  const { isSignedIn } = useUser()

  /** Load all sessions for sidebar + restore the most recent one */
  const initSessions = useCallback(async () => {
    if (!isSignedIn) { setIsLoaded(true); return }

    try {
      const res = await fetch('/api/sessions')
      const { sessions: list } = await res.json()
      setSessions(list ?? [])

      if (list && list.length > 0) {
        const latest = list[0] as ChatSessionSummary
        setCurrentSessionId(latest.id)
        const msgRes = await fetch(`/api/sessions/${latest.id}/messages`)
        const { messages: msgs } = await msgRes.json()
        setMessages(msgs ?? [])
      }
    } catch (e) {
      console.error('Failed to initialise sessions', e)
    } finally {
      setIsLoaded(true)
    }
  }, [isSignedIn, setSessions, setCurrentSessionId, setMessages, setIsLoaded])

  useEffect(() => { initSessions() }, [initSessions])

  /** Create a brand-new session (called by New Chat button) */
  const createNewSession = useCallback(async (modelId?: string): Promise<string | null> => {
    if (!isSignedIn) return null
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId }),
      })
      const { session } = await res.json()
      setSessions([session, ...sessions])
      setCurrentSessionId(session.id)
      setMessages([])
      return session.id
    } catch (e) {
      console.error('Failed to create session', e)
      return null
    }
  }, [isSignedIn, sessions, setSessions, setCurrentSessionId, setMessages])

  /** Switch to a different session */
  const switchSession = useCallback(async (sessionId: string) => {
    if (!isSignedIn) return
    try {
      setCurrentSessionId(sessionId)
      const res = await fetch(`/api/sessions/${sessionId}/messages`)
      const { messages: msgs } = await res.json()
      setMessages(msgs ?? [])
    } catch (e) {
      console.error('Failed to switch session', e)
    }
  }, [isSignedIn, setCurrentSessionId, setMessages])

  /** Save messages to Supabase (called after every AI turn) */
  const saveMessagesToDB = useCallback(async () => {
    if (!isSignedIn || !currentSessionId || messages.length === 0) return
    try {
      await fetch(`/api/sessions/${currentSessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      })
    } catch (e) {
      console.error('Failed to save messages', e)
    }
  }, [isSignedIn, currentSessionId, messages])

  return {
    createNewSession,
    switchSession,
    saveMessagesToDB,
  }
}
