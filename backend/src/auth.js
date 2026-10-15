import crypto from "node:crypto";
import { promisify } from "node:util";
import { findUserByEmail, findUserById, insertUser, listUsers } from "./db.js";

const scrypt = promisify(crypto.scrypt);
const sessionMaxAge = 60 * 60 * 24 * 7;
const sessions = new Map();

function authError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

function adminEmail() {
  return normalizeEmail(process.env.ADMIN_EMAIL ?? "admin@northstar.local");
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function verifyPassword(password, storedHash) {
  const [salt, key] = String(storedHash).split(":");
  if (!salt || !key) return false;
  const derivedKey = await scrypt(password, salt, 64);
  const expectedKey = Buffer.from(key, "hex");
  return expectedKey.length === derivedKey.length && crypto.timingSafeEqual(expectedKey, derivedKey);
}

function parseCookies(request) {
  return Object.fromEntries(
    String(request.headers.cookie ?? "")
      .split(";")
      .map((part) => part.trim().split("="))
      .filter(([key, value]) => key && value)
      .map(([key, ...value]) => [key, value.join("=")]),
  );
}

function createSession(user) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { userId: user.id, expiresAt: Date.now() + sessionMaxAge * 1000 });
  return token;
}

export function sessionCookie(token) {
  return `northstar_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionMaxAge}`;
}

export function clearSessionCookie() {
  return "northstar_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0";
}

export async function getUser(request) {
  const token = parseCookies(request).northstar_session;
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  return findUserById(session.userId);
}

export function clearSession(request) {
  const token = parseCookies(request).northstar_session;
  if (token) sessions.delete(token);
}

export async function requireUser(request) {
  const user = await getUser(request);
  if (!user) throw authError("Please sign in to continue.", 401);
  return user;
}

export async function requireAdmin(request) {
  const user = await requireUser(request);
  if (user.role !== "admin") throw authError("Admin access is required.", 403);
  return user;
}

export async function signup({ name, email, password }) {
  const cleanName = String(name ?? "").trim();
  const cleanEmail = normalizeEmail(email);
  const cleanPassword = String(password ?? "");
  if (cleanName.length < 2) throw authError("Please enter your name.");
  if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) throw authError("Please enter a valid email address.");
  if (cleanPassword.length < 8) throw authError("Password must be at least 8 characters.");
  if (await findUserByEmail(cleanEmail)) throw authError("An account with that email already exists.", 409);

  const user = {
    id: crypto.randomUUID(),
    name: cleanName,
    email: cleanEmail,
    passwordHash: await hashPassword(cleanPassword),
    role: cleanEmail === adminEmail() ? "admin" : "user",
    createdAt: new Date().toISOString(),
  };
  const savedUser = await insertUser(user);
  return { user: publicUser(savedUser), token: createSession(savedUser) };
}

export async function login({ email, password }) {
  const cleanEmail = normalizeEmail(email);
  const user = await findUserByEmail(cleanEmail);
  if (!user || !(await verifyPassword(String(password ?? ""), user.passwordHash))) {
    throw authError("Email or password is incorrect.", 401);
  }
  return { user: publicUser(user), token: createSession(user) };
}

export async function getUsers() {
  return (await listUsers()).map(publicUser);
}
