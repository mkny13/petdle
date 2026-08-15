# Petle 🐾

A Wordle-style daily word game where every answer is a pet — either a kind of
animal (`hamster`, `axolotl`, `goldfish`) or a specific breed (`poodle`,
`siamese`, `dachshund`, `cockatiel`).

**[index.html](index.html) is the entire game.** No build step, no backend, no
dependencies — open the file or drop it on any static host.

## How it plays

- **12 guesses** instead of Wordle's six.
- **Variable word length** — the board resizes to fit the day's answer, which
  runs from 3 to 10 letters. The header tells you how many letters to type.
- **Standard feedback colors**: green = right letter, right spot; yellow =
  right letter, wrong spot; gray = not in the word. Duplicate letters use
  Wordle's two-pass rule, so a second `n` only turns yellow if the answer
  really has two.
- **On-screen keyboard** that colors in as you learn letters, plus physical
  keyboard support.
- Guesses only have to be the right *length* — any letters are accepted. With a
  ~136-word list, requiring real pet words for every guess would be brutal for
  kids.
- Progress is saved in `localStorage`, so closing the tab mid-game is safe.
  Finish and you get a shareable emoji grid.

## The daily word

The answer is picked with no server involved: the local date (`YYYY-MM-DD`) is
run through an FNV-1a hash and the result indexes into the sorted word list.
Everyone who opens the page on the same calendar day gets the same pet, and a
new one appears at local midnight. Over a two-year span this uses 134 of the
136 words with no back-to-back repeats.

Because it's all client-side, the word list is visible in the page source —
unavoidable for a static game, and not worth obfuscating.

## Editing the word list

Add or remove entries in the `WORDS` array near the top of the `<script>` block.
Words must be lowercase `a`–`z` only. The list is de-duplicated and sorted at
load, so the daily mapping stays stable regardless of where you paste a new word
— though adding or removing any word does reshuffle which pet lands on which
date.

## Hosting

Any static host works: GitHub Pages, Netlify drop, an S3 bucket, or just
`python3 -m http.server` on a laptop. The file is self-contained, including the
favicon.
