// Cloudflare Worker that files a GitHub issue on behalf of an anonymous
// Petdle player, so reporting a bug or suggesting a feature never requires
// the player to have a GitHub account. The GitHub token stays server-side
// as a Worker secret and is never exposed to the browser.
//
// Setup (one-time):
//   1. npx wrangler login
//   2. npx wrangler secret put GITHUB_TOKEN   (a fine-grained PAT scoped to
//      "Issues: write" on mkny13/petdle only)
//   3. npx wrangler deploy
//   4. Copy the resulting workers.dev URL into FEEDBACK_ENDPOINT in
//      index.html.

const REPO = "mkny13/petdle";
const ALLOWED_ORIGINS = [
  "https://mkny13.github.io",
  "http://localhost:8000",
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowOrigin = ALLOWED_ORIGINS.indexOf(origin) !== -1 ? origin : ALLOWED_ORIGINS[0];
    const headers = corsHeaders(allowOrigin);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers });
    }

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
  },
};

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}
