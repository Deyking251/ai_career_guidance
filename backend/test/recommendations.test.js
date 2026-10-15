import test from "node:test";
import assert from "node:assert/strict";
import { loadData } from "../src/data.js";
import { normalizeSkills, recommendCareers, recommendJobs, skillGap } from "../src/recommendations.js";

const data = await loadData();

test("normalizes and deduplicates skills", () => {
  assert.deepEqual(normalizeSkills("Python, SQL; python"), ["python", "sql"]);
});

test("recommends a backend role for backend skills", () => {
  const result = recommendCareers(data.careers, ["Python", "SQL", "REST API"], "backend development");
  assert.equal(result[0].role, "Backend Developer");
});

test("returns missing skills for a selected role", () => {
  const result = skillGap(data.careers, "Backend Developer", ["Python", "SQL"]);
  assert.ok(result.missing.includes("docker"));
  assert.ok(!result.missing.includes("python"));
});

test("applies the preferred-location job boost", () => {
  const result = recommendJobs(data.jobs, ["Python", "SQL"], "backend development", "Kolkata");
  assert.equal(result[0].location, "Kolkata");
});
