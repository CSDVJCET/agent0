import { del } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function DELETE(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    await del(url);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete image:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
