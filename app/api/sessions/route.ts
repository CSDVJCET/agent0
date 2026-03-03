// app/api/sessions/route.ts
import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { ensureUser, createSession, getSessionsForUser } from '@/lib/db/sessions'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const sessions = await getSessionsForUser(userId)
    return NextResponse.json({ sessions })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await currentUser()
  await ensureUser(userId, user?.emailAddresses[0]?.emailAddress)

  try {
    const body = await req.json().catch(() => ({}))
    const session = await createSession(userId, body.modelId)
    return NextResponse.json({ session })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}
