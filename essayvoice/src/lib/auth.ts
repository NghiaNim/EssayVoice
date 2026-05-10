import { SignJWT, jwtVerify } from "jose";

const getSecret = () => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET env var is missing");
  return new TextEncoder().encode(s);
};

export interface TokenPayload {
  userId: string;
  username: string;
  [key: string]: unknown;
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .setIssuedAt()
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getSecret());
  return payload as unknown as TokenPayload;
}

export function extractToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

export async function getUserFromRequest(
  req: Request,
): Promise<TokenPayload | null> {
  const token = extractToken(req.headers.get("authorization"));
  if (!token) return null;
  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}
