/** Visit a durable-world host until its own clock reports no more bounded work. This is world-host operation, not a scene renderer. */
export const TICKS_OWED_HEADER = "x-world-ticks-owed";

/**
 * Read FeltOS's original GET /world contract (worker.mjs).
 * An absent owed header is a single-visit legacy result, not evidence
 * that an older host has no pending work.
 */
export async function keepWorld({
  url, fetch: request = globalThis.fetch, maxVisits = 12,
} = {}) {
  if (typeof url !== "string" || !/^https?:\/\//u.test(url))
    throw new TypeError("keepWorld needs an operator-selected http(s) world URL");
  if (typeof request !== "function")
    throw new TypeError("keepWorld requires a fetch implementation");
  if (!Number.isSafeInteger(maxVisits) || maxVisits < 1 || maxVisits > 256)
    throw new TypeError("keepWorld visits must be between 1 and 256");
  const target = new URL("/world", url);
  if (!["http:", "https:"].includes(target.protocol) ||
      target.username || target.password || target.hostname === "")
    throw new TypeError("keepWorld refuses credential-bearing or unsupported hosts");

  let visits = 0, owed = null, present = null;
  while (visits < maxVisits) {
    const response = await request(target, {
      method: "GET", headers: { accept: "application/json" }, cache: "no-store",
    });
    visits += 1;
    if (!response?.ok) throw new Error(`world ${target.href} answered ${response?.status ?? "unavailable"}`);
    present = (await response.json())?.present ?? null;
    const raw = response.headers?.get(TICKS_OWED_HEADER) ?? null;
    if (raw === null) {
      owed = null;
      break;
    }
    if (!/^(0|[1-9][0-9]*)$/u.test(raw) ||
        !Number.isSafeInteger(Number(raw))) {
      throw new TypeError("FeltOS world host reported an invalid owed-tick count");
    }
    owed = Number(raw);
    if (owed === 0) break;
  }
  return Object.freeze({ visits, owed, present });
}
