import { NextResponse } from 'next/server';
import { signToken } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    // 1. Find user in the local database
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Generic error message to prevent email enumeration
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // 2. Ensure the user is a local admin
    if (!user.isLocalAdmin || !user.passwordHash) {
      return NextResponse.json({ error: 'This account cannot be accessed via local login. Please use SSO.' }, { status: 403 });
    }

    // 3. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // 4. Generate internal JWT session token
    const internalToken = await signToken({ userId: user.id, email: user.email });

    // 5. Set the HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set('vrc_session', internalToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Local Authentication Failed:', error);
    return NextResponse.json({ error: 'An unexpected error occurred during authentication.' }, { status: 500 });
  }
}
