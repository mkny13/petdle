# Petdle feedback worker

Free Cloudflare Worker that files a GitHub issue on `mkny13/petdle` when a
player submits the in-app "Report a bug or suggest a feature" form. It holds
the GitHub token server-side, so players never need a GitHub account.

## Deploy

```
cd cloudflare-worker
npx wrangler login
npx wrangler secret put GITHUB_TOKEN
npx wrangler deploy
```

For `GITHUB_TOKEN`, create a fine-grained personal access token
(github.com/settings/personal-access-tokens/new) scoped to just this repo
with **Issues: Read and write** permission — nothing broader.

`wrangler deploy` prints a `*.workers.dev` URL. Paste it into
`FEEDBACK_ENDPOINT` near the top of the `<script>` block in `../index.html`,
then commit and push.

## Cost

Free. Cloudflare Workers' free tier covers 100,000 requests/day, far more
than a small game's feedback volume needs.

## Fallback

If `FEEDBACK_ENDPOINT` is left as the placeholder, or a request to it fails
for any reason (worker down, rate-limited, etc.), the app falls back to
opening a prefilled `github.com/.../issues/new` link instead — which still
works, just requires the player to be signed into GitHub.
