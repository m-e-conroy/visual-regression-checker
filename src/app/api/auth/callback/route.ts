import { NextResponse } from 'next/server';
import { validateSsoToken, signToken } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ssoToken = searchParams.get('token');

  if (!ssoToken) {
    return NextResponse.json({ error: 'Missing token in query string.' }, { status: 400 });
  }

  try {
    // 1. Validate the SSO token and extract user details
    const userProfile = await validateSsoToken(ssoToken);
    
    // 2. Ensure user exists in our local database
    let user = await prisma.user.findUnique({
      where: { email: userProfile.email }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: userProfile.email,
          name: userProfile.name,
          settings: {
            create: {} // Create default settings
          }
        }
      });
    }

    // 3. Generate our internal JWT
    const internalToken = await signToken({ userId: user.id, email: user.email });

    // 4. Set the HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set('vrc_session', internalToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    // 5. Redirect back to the dashboard
    return NextResponse.redirect(new URL('/', request.url));
  } catch (error) {
    console.error('SSO Authentication Failed:', error);
    return NextResponse.json({ error: 'Authentication failed.' }, { status: 401 });
  }
}
