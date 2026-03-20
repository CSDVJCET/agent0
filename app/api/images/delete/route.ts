import { del } from '@vercel/blob';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pathname } = await request.json();

    if (!pathname || typeof pathname !== 'string') {
      return NextResponse.json({ error: 'Pathname is required' }, { status: 400 });
    }

    const expectedPrefix = `generated-images/${userId}/`;
    if (!pathname.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    if (!token) {
      return NextResponse.json({ error: 'Blob token missing' }, { status: 500 });
    }

    await del(pathname, { token });

    return NextResponse.json(
      { success: true },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('Failed to delete image:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
