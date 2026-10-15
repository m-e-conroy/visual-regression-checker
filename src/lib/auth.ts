import { SignJWT, jwtVerify } from 'jose';

// In a real app, this should be fetched from environment variables or AppSettings in the DB
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET || 'fallback_secret_for_development_only';
  return new TextEncoder().encode(secret);
};

export async function signToken(payload: { userId: string; email: string }) {
  const secret = getJwtSecret();
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);
}

export async function verifyToken(token: string) {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

// Mock function for validating the custom SSO Token
export async function validateSsoToken(ssoToken: string) {
  // TODO: Implement actual custom SSO validation logic here.
  // For now, we simulate a successful validation that returns user info.
  console.log('Validating custom SSO token:', ssoToken);
  
  // Simulated delay
  await new Promise((resolve) => setTimeout(resolve, 500));
  
  if (!ssoToken) {
    throw new Error('Invalid SSO Token');
  }

  // Simulate returning the parsed user profile
  return {
    email: 'admin@corporate.local',
    name: 'System Administrator'
  };
}
