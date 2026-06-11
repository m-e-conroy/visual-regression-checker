import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ scanId: string }> }
) {
  try {
    const { scanId } = await params;
    
    // Auth Check
    const cookieStore = await cookies();
    const token = cookieStore.get('vrc_session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });

    const body = await request.json();
    const { reason, makeBaseline } = body;

    if (!reason) {
      return NextResponse.json({ error: 'Missing approval reason' }, { status: 400 });
    }

    const scan = await prisma.scan.findUnique({ where: { id: scanId } });
    if (!scan) return NextResponse.json({ error: 'Scan not found' }, { status: 404 });

    // Perform database transaction if making a new baseline
    if (makeBaseline) {
      await prisma.$transaction([
        // Remove baseline status from existing baseline(s) for this page
        prisma.scan.updateMany({
          where: { pageId: scan.pageId, isBaseline: true },
          data: { isBaseline: false }
        }),
        // Set this scan as the new baseline and mark as APPROVED
        prisma.scan.update({
          where: { id: scanId },
          data: {
            status: 'APPROVED',
            approvedReason: reason,
            isBaseline: true
          }
        })
      ]);
    } else {
      // Just mark as APPROVED without altering baselines
      await prisma.scan.update({
        where: { id: scanId },
        data: {
          status: 'APPROVED',
          approvedReason: reason
        }
      });
    }

    return NextResponse.json({ success: true, message: 'Scan approved successfully.' });
  } catch (error) {
    console.error('Scan Approval Failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
