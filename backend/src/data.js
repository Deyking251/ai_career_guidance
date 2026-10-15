import { readCsv } from "./csv.js";

const careersUrl = new URL("../../data/careers.csv", import.meta.url);
const jobsUrl = new URL("../../data/jobs.csv", import.meta.url);

export async function loadData() {
  const [careers, jobs] = await Promise.all([readCsv(careersUrl), readCsv(jobsUrl)]);
  return { careers, jobs };
}
