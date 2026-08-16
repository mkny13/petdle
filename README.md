# Petle 🐾

A Wordle-style daily word game where every answer is a pet — either a kind of
animal (`hamster`, `axolotl`, `goldfish`) or a specific breed (`poodle`,
`dachshund`, `cockatiel`).

**[index.html](index.html) is the entire game.** No build step, no backend, no
dependencies — open the file or drop it on any static host.

## How it plays

- **12 guesses** instead of Wordle's six.
- **Variable word length** — the board resizes to fit the day's answer, which
  runs from 3 to 10 letters.
- **A category hint** above the board, alongside the length: `Dog breed · 9
  letters`. Playtesting showed that an 8- or 9-letter answer with no category is
  close to unguessable, so every answer names its group — *Dog breed*,
  *Rabbit breed*, *Pet bird*, *Fish or aquarium pet*, *Reptile or
  amphibian*, *Small furry pet*, *Farm or backyard pet*, *Creepy-crawly pet*, or
  *Kind of pet* for the general ones like `puppy`.
- **A 💡 hint button**, twice per puzzle: first a written clue about the day's
  pet (`CLUES` holds one for every answer, and never names the animal or repeats
  the category), then a single letter from the *middle* of the word. Middle
  rather than first: on a three-letter pet the opening letter is a third of the
  answer, and it's the letter guessing tends to pin down anyway. Hints cost no
  guess; they mark the shared result with a 💡.
- **Standard feedback colors**: green = right letter, right spot; yellow =
  right letter, wrong spot; gray = not in the word. Duplicate letters use
  Wordle's two-pass rule, so a second `n` only turns yellow if the answer
  really has two.
- **On-screen keyboard** that colors in as you learn letters, plus physical
  keyboard support.
- **Guesses must be real animal words** of the right length — but *any* animal
  counts, not just pets, so `elephant` is a fine way to probe letters while
  hunting an 8-letter dog breed. A rejected guess shakes the row and costs
  nothing. Restricting guesses to *pets* would be brutal (114 words); opening it
  to any animal keeps 37–103 legal guesses at every length the game uses.
- Progress is saved in `localStorage`, so closing the tab mid-game is safe.
  Finish and you get a shareable emoji grid.

## The daily word

The answer is picked with no server involved: the local date (`YYYY-MM-DD`) is
run through an FNV-1a hash and the result indexes into the sorted word list.
Everyone who opens the page on the same calendar day gets the same pet, and a
new one appears at local midnight. Over a two-year span this uses 112 of the
114 words with no back-to-back repeats.

Because it's all client-side, the word list is visible in the page source —
unavoidable for a static game, and not worth obfuscating.

## Editing the word list

Add or remove entries in the `GROUPS` array near the top of the `<script>` block.
Each entry is `["Category name", ["word", "word", …]]`, and the category string
is exactly what players see as the hint — so a new group needs no other change.
Words must be lowercase `a`–`z` only, and a word belongs to one category (if it
appears in two groups, the first one wins).

The groups are flattened, de-duplicated and sorted at load, so the daily mapping
stays stable regardless of which group you paste a new word into — though adding
or removing any word does reshuffle which pet lands on which date. Re-grouping
existing words is free: it changes hints, never the schedule.

## Editing the guess list

`OTHER_ANIMALS`, just below `GROUPS`, holds the animals that are *not* possible
answers — wild mammals, birds, fish, reptiles, bugs, and breeds beyond the answer
list. Legal guesses are `GROUPS` + `OTHER_ANIMALS`, so every answer is always
guessable and this list only ever widens what's accepted. Adding to it never
changes which pet lands on which date.

Breeds are deliberately included: the hint often reads *Dog breed*, so players
type dog breeds, and rejecting a real one reads as a bug. If playtesters hit
"Not an animal we know" on a legitimate word, that's the list needing a new
entry, not the player being wrong.

Words run 3–10 letters, matching the answers. An 11-letter word would be dead
weight — the board is always exactly as wide as the day's pet, so a guess can
only ever be the answer's length.

## Hosting

Any static host works: GitHub Pages, Netlify drop, an S3 bucket, or just
`python3 -m http.server` on a laptop. The file is self-contained, including the
favicon.

### GitHub Pages

Live at **https://mkny13.github.io/petdle/**.

Settings → Pages → Source is **Deploy from a branch**, branch `main`, folder
`/ (root)`. Every push to `main` republishes the site. No workflow and no build
step — `index.html` at the repo root is the whole site.
