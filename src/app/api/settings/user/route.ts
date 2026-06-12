import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('vrc_session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const settings = await prisma.settings.findUnique({
      where: { userId: payload.userId as string }
    });

    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      select: { passwordHash: true }
    });
    const isLocalUser = !!user?.passwordHash;

    if (!settings) {
      const newSettings = await prisma.settings.create({
        data: { userId: payload.userId as string }
      });
      return NextResponse.json({ ...newSettings, isLocalUser });
    }
    
    return NextResponse.json({ ...settings, isLocalUser });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch user settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('vrc_session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const body = await request.json();
    const { emailNotifications, teamsNotifications, teamsWebhookUrl } = body;

    const updated = await prisma.settings.upsert({
      where: { userId: payload.userId as string },
      update: {
        emailNotifications,
        teamsNotifications,
        teamsWebhookUrl
      },
      create: {
        userId: payload.userId as string,
        emailNotifications,
        teamsNotifications,
        teamsWebhookUrl
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update user settings' }, { status: 500 });
  }
}
