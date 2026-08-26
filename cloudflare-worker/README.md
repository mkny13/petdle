# Petdle feedback + leaderboard worker

Free Cloudflare Worker with two jobs:

1. Files a GitHub issue on `mkny13/petdle` when a player submits the in-app
   "Report a bug or suggest a feature" form. It holds the GitHub token
   server-side, so players never need a GitHub account.
2. Backs the family leaderboard (`🏆` button in the app): each device POSTs
   its player's latest result to `/leaderboard`, and any device can GET it
   back to see everyone's current streak, best streak, and today's result.
   Storage is a Workers KV namespace, one key per player name.

There's no login on the leaderboard — any device can POST under any name.
That's fine for a handful of trusted family members sharing a URL; it is
not meant for a leaderboard where players might want to impersonate each
other.

## Deploy

```
cd cloudflare-worker
npx wrangler login
npx wrangler secret put GITHUB_TOKEN
npx wrangler kv namespace create LEADERBOARD
```

Paste the id `wrangler kv namespace create` prints into the `id` field of
the `kv_namespaces` block in `wrangler.toml` (it starts out as
`REPLACE_WITH_KV_NAMESPACE_ID`), then:

```
npx wrangler deploy
```

For `GITHUB_TOKEN`, create a fine-grained personal access token
(github.com/settings/personal-access-tokens/new) scoped to just this repo
with **Issues: Read and write** permission — nothing broader.

`wrangler deploy` prints a `*.workers.dev` URL. Paste it into
`FEEDBACK_ENDPOINT` near the top of the `<script>` block in `../index.html`
(the leaderboard endpoint is derived from it automatically), then commit
and push.

## Cost

Free. Cloudflare Workers' free tier covers 100,000 requests/day, and
Workers KV's free tier covers 1,000 writes/day and 100,000 reads/day — far
more than a small family's daily play volume needs.

## Fallback

If `FEEDBACK_ENDPOINT` is left as the placeholder, or a request to it fails
for any reason (worker down, rate-limited, etc.), the app falls back to
opening a prefilled `github.com/.../issues/new` link instead — which still
works, just requires the player to be signed into GitHub.

Similarly, if the leaderboard request fails (worker down, KV namespace not
yet created), the leaderboard overlay just shows a "couldn't load" message
and today's result submission silently no-ops — the game itself is never
blocked on the leaderboard being reachable.
