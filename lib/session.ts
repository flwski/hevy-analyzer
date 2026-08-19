import "server-only";
import { cookies } from "next/headers";

const COOKIE_NAME = "hevy_session";
const encoder = new TextEncoder();

async function cryptoKey() {
  const secret = process.env.HEVY_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("HEVY_SESSION_SECRET deve ter pelo menos 32 caracteres.");
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function encode(bytes: Uint8Array) { return Buffer.from(bytes).toString("base64url"); }
function decode(value: string) { return new Uint8Array(Buffer.from(value, "base64url")); }

export async function encryptApiKey(apiKey: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await cryptoKey(), encoder.encode(apiKey));
  return `${encode(iv)}.${encode(new Uint8Array(encrypted))}`;
}

export async function decryptApiKey(value: string) {
  try { const [iv, payload] = value.split("."); const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decode(iv) }, await cryptoKey(), decode(payload)); return new TextDecoder().decode(decrypted); }
  catch { return null; }
}

export async function getSessionApiKey() {
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  return value ? decryptApiKey(value) : null;
}

export async function setSession(apiKey: string) {
  (await cookies()).set(COOKIE_NAME, await encryptApiKey(apiKey), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
}

export async function clearSession() { (await cookies()).delete(COOKIE_NAME); }
