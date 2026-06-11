import { NextResponse } from 'next/server';
import { runScanForSite } from '@/lib/orchestrator';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
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

    const body = await request.json();
    const { siteId } = body;

    if (!siteId) {
      return NextResponse.json({ error: 'Missing siteId parameter' }, { status: 400 });
    }

    // Trigger the scan asynchronously so we don't block the API response
    // In a production app, use a queue like BullMQ.
    runScanForSite(siteId, payload.userId as string).catch(err => console.error('Background Scan Error:', err));

    return NextResponse.json({ success: true, message: 'Scan triggered successfully in the background.' });
  } catch (error) {
    console.error('Trigger Scan Failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
