# Sigil Cat

A goofy trinket website. Live at **https://yznaig.github.io/sigil-cat/**

## How it's laid out

- `index.html` — the home page (the "shelf").
- `trinkets.js` — the list of trinkets shown on the shelf. One line each.
- `trinkets/` — one HTML file per trinket. Each one is its own little page.

Keeping each trinket in its own file means two people can build at the same time without stepping on each other.

## Add a trinket

1. Copy `trinkets/staring-cat.html` to `trinkets/your-thing.html` and make it do something silly.
2. Add a line to `trinkets.js`: `{ emoji: "🦆", name: "Your Thing", file: "your-thing.html" },`
3. Commit. The live site updates about a minute later.

## Editing without installing anything

On the repo page on github.com, press the `.` key. A full editor opens in your browser. Edit, then use the Source Control tab (left side) to commit.

## Editing on your own computer

```
git clone https://github.com/yznaig/sigil-cat.git
cd sigil-cat
# open index.html in a browser to preview
git pull          # get the other person's changes first
git add -A && git commit -m "add duck trinket"
git push
```
