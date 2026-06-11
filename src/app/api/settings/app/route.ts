import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const appSettings = await prisma.appSettings.findUnique({
      where: { id: 'global' }
    });
    
    // Create default if none exists
    if (!appSettings) {
      const newSettings = await prisma.appSettings.create({
        data: { id: 'global' }
      });
      return NextResponse.json(newSettings);
    }
    
    return NextResponse.json(appSettings);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch app settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Auth Check
    const cookieStore = await cookies();
    const token = cookieStore.get('vrc_session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const body = await request.json();
    const { smtpHost, smtpPort, smtpUser, smtpPass, jwtSecret } = body;

    const updated = await prisma.appSettings.upsert({
      where: { id: 'global' },
      update: {
        smtpHost,
        smtpPort: smtpPort ? parseInt(smtpPort, 10) : null,
        smtpUser,
        smtpPass: smtpPass || null, // Allow clearing password
        jwtSecret
      },
      create: {
        id: 'global',
        smtpHost,
        smtpPort: smtpPort ? parseInt(smtpPort, 10) : null,
        smtpUser,
        smtpPass,
        jwtSecret
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update app settings' }, { status: 500 });
  }
}
