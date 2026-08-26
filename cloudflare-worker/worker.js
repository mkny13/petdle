// Cloudflare Worker with two jobs for Petdle:
//
//   1. Files a GitHub issue on behalf of an anonymous player when they use
//      the in-app feedback form, so reporting a bug never requires the
//      player to have a GitHub account. The GitHub token stays server-side
//      as a Worker secret and is never exposed to the browser.
//   2. Backs the family leaderboard: each device POSTs its player's latest
//      result to /leaderboard, and any device can GET /leaderboard to see
//      everyone's current streak, best streak, and today's result. Storage
//      is a Workers KV namespace, one key per player name — there's no
//      login, so this is a shared bulletin board, not an authenticated
//      scoreboard. Fine for a handful of family members; don't use it for
//      anything where players might want to impersonate each other.
//
// Setup (one-time):
//   1. npx wrangler login
//   2. npx wrangler secret put GITHUB_TOKEN   (a fine-grained PAT scoped to
//      "Issues: write" on mkny13/petdle only)
//   3. npx wrangler kv namespace create LEADERBOARD
//      -> paste the printed id into the kv_namespaces block in wrangler.toml
//   4. npx wrangler deploy
//   5. Copy the resulting workers.dev URL into FEEDBACK_ENDPOINT in
//      index.html (LEADERBOARD_ENDPOINT is derived from it automatically).

const REPO = "mkny13/petdle";
const ALLOWED_ORIGINS = [
  "https://mkny13.github.io",
  "http://localhost:8000",
];

const NAME_RE = /^[\w][\w '-]{0,23}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowOrigin = ALLOWED_ORIGINS.indexOf(origin) !== -1 ? origin : ALLOWED_ORIGINS[0];
    const headers = corsHeaders(allowOrigin);
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    if (url.pathname === "/leaderboard") {
      if (request.method === "GET") return getLeaderboard(env, headers);
      if (request.method === "POST") return submitScore(request, env, headers);
      return new Response("Method not allowed", { status: 405, headers });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers });
    }
    return submitFeedback(request, env, headers);
  },
};

async function submitFeedback(request, env, headers) {
  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return new Response("Invalid JSON", { status: 400, headers });
  }

  const type = payload.type === "enhancement" ? "enhancement" : "bug";
  const text = String(payload.text || "").trim().slice(0, 2000);
  const puzzleNo = String(payload.puzzleNo || "").slice(0, 20);
  const userAgent = String(payload.userAgent || "").slice(0, 300);

  if (!text) {
    return new Response("Missing feedback text", { status: 400, headers });
  }

  const title = (type === "bug" ? "Bug: " : "Feature: ") + text.slice(0, 60).replace(/\s+/g, " ");
  const body = text
    + "\n\n---\nPet #" + puzzleNo
    + "\n" + userAgent
    + "\n\n_Submitted via the in-app feedback form._";

  const ghResponse = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json",
      "User-Agent": "petdle-feedback-worker",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, body, labels: [type] }),
  });

  if (!ghResponse.ok) {
    return new Response("Failed to file issue", { status: 502, headers });
  }

  const issue = await ghResponse.json();
  return new Response(JSON.stringify({ ok: true, url: issue.html_url }), { headers });
}

async function submitScore(request, env, headers) {
  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return new Response("Invalid JSON", { status: 400, headers });
  }

  const name = String(payload.name || "").trim().slice(0, 24);
  if (!NAME_RE.test(name)) {
    return new Response("Invalid name", { status: 400, headers });
  }
  const date = String(payload.date || "");
  if (!DATE_RE.test(date)) {
    return new Response("Invalid date", { status: 400, headers });
  }
  const status = payload.status === "won" ? "won" : payload.status === "lost" ? "lost" : null;
  if (!status) {
    return new Response("Invalid status", { status: 400, headers });
  }

  const record = {
    name: name,
    date: date,
    puzzleNo: String(payload.puzzleNo || "").slice(0, 20),
    status: status,
    guesses: clampInt(payload.guesses, 0, 12),
    hints: clampInt(payload.hints, 0, 3),
    currentStreak: clampInt(payload.currentStreak, 0, 100000),
    maxStreak: clampInt(payload.maxStreak, 0, 100000),
    played: clampInt(payload.played, 0, 100000),
    wins: clampInt(payload.wins, 0, 100000),
    updatedAt: Date.now(),
  };

  await env.LEADERBOARD.put("player:" + name.toLowerCase(), JSON.stringify(record));
  return new Response(JSON.stringify({ ok: true }), { headers });
}

async function getLeaderboard(env, headers) {
  const list = await env.LEADERBOARD.list({ prefix: "player:" });
  const players = await Promise.all(
    list.keys.map(async (k) => {
      try {
        return JSON.parse(await env.LEADERBOARD.get(k.name));
      } catch (e) {
        return null;
      }
    })
  );
  return new Response(JSON.stringify({ players: players.filter(Boolean) }), { headers });
}

function clampInt(v, min, max) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}
