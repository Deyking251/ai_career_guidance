const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
  "in", "is", "it", "of", "on", "or", "that", "the", "this", "to",
  "with",
]);

export function normalizeSkills(value) {
  const values = Array.isArray(value) ? value : String(value ?? "").split(/[,;\n]/);
  return [...new Set(values.map((skill) => String(skill).trim().toLowerCase()).filter(Boolean))].sort();
}

function tokenize(value) {
  return String(value ?? "")
    .toLowerCase()
    .match(/[a-z0-9+#./-]+/g)
    ?.filter((token) => !STOP_WORDS.has(token)) ?? [];
}

function vectorize(text, vocabulary, idf) {
  const tokens = tokenize(text);
  const counts = new Map();
  for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
  const length = Math.max(tokens.length, 1);
  return vocabulary.map((token, index) => ((counts.get(token) ?? 0) / length) * idf[index]);
}

function cosine(left, right) {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] ** 2;
    rightNorm += right[index] ** 2;
  }
  return leftNorm && rightNorm ? dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm)) : 0;
}

function similarityScores(documents, query) {
  const tokenized = documents.map(tokenize);
  const vocabulary = [...new Set(tokenized.flat())].sort();
  const idf = vocabulary.map((token) => {
    const documentFrequency = tokenized.filter((tokens) => tokens.includes(token)).length;
    return Math.log((documents.length + 1) / (documentFrequency + 1)) + 1;
  });
  const queryVector = vectorize(query, vocabulary, idf);
  return tokenized.map((_, index) => cosine(vectorize(documents[index], vocabulary, idf), queryVector));
}

export function recommendCareers(careers, skills, interests) {
  const query = `${normalizeSkills(skills).join(" ")} ${interests ?? ""}`.trim();
  const scores = similarityScores(careers.map((career) => career.profile ?? ""), query);
  return careers
    .map((career, index) => ({ ...career, score: scores[index] }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);
}

export function skillGap(careers, role, skills) {
  const career = careers.find((item) => item.role === role);
  if (!career) return null;
  const required = normalizeSkills(career.required_skills);
  const have = new Set(normalizeSkills(skills));
  return {
    role,
    required,
    missing: required.filter((skill) => !have.has(skill)),
  };
}

export function recommendJobs(jobs, skills, interests, location) {
  const query = `${normalizeSkills(skills).join(" ")} ${interests ?? ""}`.trim();
  const scores = similarityScores(jobs.map((job) => job.description ?? ""), query);
  return jobs
    .map((job, index) => {
      let match = scores[index] * 100;
      if (location && job.location?.toLowerCase().includes(String(location).toLowerCase())) match += 5;
      return { ...job, match };
    })
    .sort((left, right) => right.match - left.match)
    .slice(0, 6);
}
