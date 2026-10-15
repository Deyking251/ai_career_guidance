import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const legacyUsersUrl = new URL("../../data/users.json", import.meta.url);
let pool;

function databaseConfig() {
  const database = process.env.MYSQL_DATABASE ?? "ai_career_guidance";
  if (!/^[A-Za-z0-9_]+$/.test(database)) throw new Error("MYSQL_DATABASE may contain only letters, numbers, and underscores.");
  return {
    host: process.env.MYSQL_HOST ?? "127.0.0.1",
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER ?? "root",
    password: process.env.MYSQL_PASSWORD ?? "",
    database,
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT ?? 10),
    charset: "utf8mb4",
  };
}

function asIsoDate(value) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function publicUserRow(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: asIsoDate(row.created_at),
    passwordHash: row.password_hash,
  };
}

async function migrateLegacyUsers() {
  let legacyUsers;
  try {
    legacyUsers = JSON.parse(await fs.readFile(fileURLToPath(legacyUsersUrl), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  if (!Array.isArray(legacyUsers)) return;
  for (const user of legacyUsers) {
    if (!user.id || !user.email || !user.passwordHash) continue;
    await pool.execute(
      `INSERT IGNORE INTO users (id, name, email, password_hash, role, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user.id, user.name, user.email, user.passwordHash, user.role ?? "user", new Date(user.createdAt ?? Date.now())],
    );
  }
}

export async function initDatabase() {
  const config = databaseConfig();
  const bootstrap = await mysql.createConnection({ host: config.host, port: config.port, user: config.user, password: config.password });
  await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await bootstrap.end();

  pool = mysql.createPool(config);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id CHAR(36) PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(254) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'user',
      created_at DATETIME(3) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      user_id CHAR(36) PRIMARY KEY,
      education VARCHAR(120) NOT NULL DEFAULT '',
      branch VARCHAR(160) NOT NULL DEFAULT '',
      skills JSON NOT NULL,
      interests TEXT NOT NULL,
      location VARCHAR(160) NOT NULL DEFAULT '',
      updated_at DATETIME(3) NOT NULL,
      CONSTRAINT profiles_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await migrateLegacyUsers();
}

function connection() {
  if (!pool) throw new Error("Database has not been initialized.");
  return pool;
}

export async function findUserByEmail(email) {
  const [rows] = await connection().execute("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
  return rows[0] ? publicUserRow(rows[0]) : null;
}

export async function findUserById(id) {
  const [rows] = await connection().execute("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
  return rows[0] ? publicUserRow(rows[0]) : null;
}

export async function insertUser(user) {
  await connection().execute(
    `INSERT INTO users (id, name, email, password_hash, role, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [user.id, user.name, user.email, user.passwordHash, user.role, new Date(user.createdAt)],
  );
  return findUserById(user.id);
}

export async function listUsers() {
  const [rows] = await connection().query("SELECT * FROM users ORDER BY created_at DESC");
  return rows.map(publicUserRow);
}

export async function upsertProfile(userId, profile) {
  await connection().execute(
    `INSERT INTO profiles (user_id, education, branch, skills, interests, location, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       education = VALUES(education), branch = VALUES(branch), skills = VALUES(skills),
       interests = VALUES(interests), location = VALUES(location), updated_at = VALUES(updated_at)`,
    [
      userId,
      String(profile.education ?? ""),
      String(profile.branch ?? ""),
      JSON.stringify(Array.isArray(profile.skills) ? profile.skills : []),
      String(profile.interests ?? ""),
      String(profile.location ?? ""),
      new Date(),
    ],
  );
}

export async function findProfile(userId) {
  const [rows] = await connection().execute("SELECT * FROM profiles WHERE user_id = ? LIMIT 1", [userId]);
  if (!rows[0]) return null;
  return {
    education: rows[0].education,
    branch: rows[0].branch,
    skills: typeof rows[0].skills === "string" ? JSON.parse(rows[0].skills) : rows[0].skills,
    interests: rows[0].interests,
    location: rows[0].location,
    updatedAt: asIsoDate(rows[0].updated_at),
  };
}
