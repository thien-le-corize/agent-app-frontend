import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shareId = searchParams.get('share_id');

  if (!shareId) {
    return NextResponse.json({ error: 'share_id is required' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://promptsref.com/api/work/get-prompt-by-share-id?share_id=${shareId}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch prompt' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch prompt' }, { status: 500 });
  }
}
