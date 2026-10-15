import "dotenv/config";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import { loadData } from "./data.js";
import { normalizeSkills, recommendCareers, recommendJobs, skillGap } from "./recommendations.js";
import {
  clearSession,
  clearSessionCookie,
  getUser,
  getUsers,
  login,
  requireAdmin,
  requireUser,
  sessionCookie,
  signup,
} from "./auth.js";
import { findProfile, initDatabase, upsertProfile } from "./db.js";

const port = Number(process.env.PORT ?? 3000);
const data = await loadData();
await initDatabase();
const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../frontend/dist");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jsx": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function sendJson(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    ...headers,
  });
  response.end(JSON.stringify(payload));
}

function parseSkills(value) {
  return normalizeSkills(value ?? "");
}

async function serveFrontend(url, response) {
  let requestedPath;
  try {
    requestedPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  } catch {
    return false;
  }

  const filePath = path.resolve(frontendRoot, `.${requestedPath}`);
  if (filePath !== frontendRoot && !filePath.startsWith(`${frontendRoot}${path.sep}`)) return false;

  try {
    const file = await fs.readFile(filePath);
    response.writeHead(200, {
      "content-type": mimeTypes[path.extname(filePath)] ?? "application/octet-stream",
      "cache-control": "no-cache",
    });
    response.end(file);
    return true;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return false;
  }
}

async function readBody(request) {
  let body = "";
  for await (const chunk of request) body += chunk;
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    const error = new Error("Request body must be valid JSON");
    error.statusCode = 400;
    throw error;
  }
}

async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    });
    response.end();
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);
  const skills = parseSkills(url.searchParams.get("skills"));
  const interests = url.searchParams.get("interests") ?? "";
  const location = url.searchParams.get("location") ?? "";

  if (request.method === "GET" && url.pathname === "/api") {
    sendJson(response, 200, { name: "AI Career Guidance API", status: "ok", version: "1.0.0" });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, {
      status: "ok",
      careers: data.careers.length,
      jobs: data.jobs.length,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/auth/me") {
    const user = await getUser(request);
    if (!user) {
      sendJson(response, 401, { error: "Not signed in" });
      return;
    }
    sendJson(response, 200, { user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt } });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/signup") {
    const result = await signup(await readBody(request));
    sendJson(response, 201, { user: result.user }, { "set-cookie": sessionCookie(result.token) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/login") {
    const result = await login(await readBody(request));
    sendJson(response, 200, { user: result.user }, { "set-cookie": sessionCookie(result.token) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/logout") {
    clearSession(request);
    sendJson(response, 200, { ok: true }, { "set-cookie": clearSessionCookie() });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/admin/overview") {
    await requireAdmin(request);
    const users = await getUsers();
    sendJson(response, 200, {
      users,
      stats: {
        totalUsers: users.length,
        totalCareers: data.careers.length,
        totalJobs: data.jobs.length,
      },
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/profile") {
    const user = await requireUser(request);
    sendJson(response, 200, { profile: await findProfile(user.id) });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/careers") {
    sendJson(response, 200, data.careers);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/jobs") {
    sendJson(response, 200, data.jobs);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/careers/recommend") {
    sendJson(response, 200, recommendCareers(data.careers, skills, interests));
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/jobs/recommend") {
    sendJson(response, 200, recommendJobs(data.jobs, skills, interests, location));
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/skill-gap") {
    const role = url.searchParams.get("role") ?? "";
    const result = skillGap(data.careers, role, skills);
    if (!result) {
      sendJson(response, 404, { error: `Unknown career role: ${role}` });
      return;
    }
    sendJson(response, 200, result);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/recommendations") {
    const body = await readBody(request);
    const user = await getUser(request);
    if (user) await upsertProfile(user.id, body);
    sendJson(response, 200, {
      careers: recommendCareers(data.careers, body.skills ?? [], body.interests ?? ""),
      jobs: recommendJobs(data.jobs, body.skills ?? [], body.interests ?? "", body.location ?? ""),
    });
    return;
  }

  if (request.method === "GET" && !url.pathname.startsWith("/api/")) {
    if (await serveFrontend(url, response)) return;
  }

  sendJson(response, 404, { error: "Route not found" });
}

const server = http.createServer((request, response) => {
  handler(request, response).catch((error) => {
    sendJson(response, error.statusCode ?? 500, { error: error.message ?? "Internal server error" });
  });
});

server.listen(port, () => {
  console.log(`AI Career Guidance API listening on http://localhost:${port}`);
});
