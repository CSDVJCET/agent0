// app/api/memory/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getMemoriesForUser, upsertMemory, deleteMemory } from '@/lib/db/memory'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const memories = await getMemoriesForUser(userId)
    return NextResponse.json({ memories })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch memories' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { key, value, category } = await req.json()
    const memory = await upsertMemory(userId, key, value, category)
    return NextResponse.json({ memory })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to save memory' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await req.json()
    await deleteMemory(userId, id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 })
  }
}
