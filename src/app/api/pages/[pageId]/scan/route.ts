import { NextResponse } from 'next/server';
import { runScanForPage } from '@/lib/orchestrator';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const { pageId } = await params;
    
    // Basic Authentication Check
    const cookieStore = await cookies();
    const token = cookieStore.get('vrc_session')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    if (!pageId) {
      return NextResponse.json({ error: 'Missing pageId parameter' }, { status: 400 });
    }

    // Trigger the single page scan asynchronously
    runScanForPage(pageId, payload.userId as string).catch(err => console.error('Background Single Page Scan Error:', err));

    return NextResponse.json({ success: true, message: 'Page scan triggered successfully in the background.' });
  } catch (error) {
    console.error('Trigger Single Page Scan Failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
