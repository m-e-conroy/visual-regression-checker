import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function GET(
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

    const scan = await prisma.scan.findFirst({
      where: { pageId },
      orderBy: { createdAt: 'desc' }
    });

    if (!scan) {
      return NextResponse.json({ scan: null });
    }

    return NextResponse.json({ scan });
  } catch (error) {
    console.error('Latest Scan Fetch Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
