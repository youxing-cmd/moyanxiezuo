import { createMiddleware } from 'hono/factory';
import { jwtVerify, SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'jiuzhang-writing-secret-key-2025');

export async function signToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<Record<string, unknown>> {
  const { payload } = await jwtVerify(token, JWT_SECRET, { clockTolerance: 60 });
  return payload as Record<string, unknown>;
}

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // 未登录：使用游客身份（userId = 1）
    c.set('userId', 1);
    c.set('user', { userId: 1, username: 'guest', role: 'guest' });
    await next();
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = await verifyToken(token);
    c.set('userId', payload.userId as number);
    c.set('user', payload);
    await next();
  } catch {
    // token 过期也降级为游客身份
    c.set('userId', 1);
    c.set('user', { userId: 1, username: 'guest', role: 'guest' });
    await next();
  }
});

declare module 'hono' {
  interface ContextVariableMap {
    userId: number;
    user: Record<string, unknown>;
  }
}
