import { SignJWT, jwtVerify } from "jose";

// Authentication is stateless: no database-backed sessions are created.
export async function createAccessToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("15m").sign(secret);
}
export async function authenticate(token: string) { return jwtVerify(token, secret) }
