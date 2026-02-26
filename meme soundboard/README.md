# 🔊 MemePad — Professional Meme Soundboard

A clean, professional meme soundboard built with **HTML, CSS, and vanilla JavaScript** — inspired by the retro arcade button aesthetic of Myinstants. Hit the glossy dome buttons to instantly fire off your favourite internet sounds.

---

## 📸 Features

- **20 popular meme sounds** — Vine Boom, Bruh, Airhorn, Oof, Wasted, FBI Open Up, and many more
- **Glossy 3D dome buttons** — radial-gradient shading + specular highlight pseudo-elements for a real arcade button feel
- **Mechanical press animation** — buttons physically push down on click, shadow collapses to simulate depth
- **Live search bar** — filter sounds by name in real time
- **PWR LED indicator** — lights up when a sound is playing
- **Fully mobile responsive** — adapts from 4-column desktop grid down to 2-column on small phones
- **No dependencies** — pure HTML/CSS/JS, no frameworks, no build tools

---

## 🗂️ Project Structure

```
meme soundboard/
├── index.html      # Markup — buttons, audio tags, layout
├── style.css       # All styling — dome buttons, grid, responsive
├── script.js       # Playback logic, search filter, press feedback
└── README.md       # This file
```

---

## 🚀 Running Locally

No build step needed. Simply open `index.html` in any modern browser:

```bash
# Option 1 — Double-click index.html in File Explorer

# Option 2 — Use VS Code Live Server extension
# Right-click index.html → "Open with Live Server"

# Option 3 — Python quick server (from project folder)
python -m http.server 8080
# Then open http://localhost:8080
```

> **Note:** Audio is streamed from `myinstants.com`. An active internet connection is required for sounds to play.

---

## 🎵 Sound List

| Button Label    | Sound                        |
|-----------------|------------------------------|
| VINE BOOM       | The classic Vine door slam   |
| BRUH            | Bruh moment                  |
| AIRHORN         | MLG airhorn                  |
| OOF             | Roblox death sound           |
| WASTED          | GTA V wasted jingle          |
| FBI OPEN UP     | FBI open up SFX              |
| CRICKETS        | Awkward silence crickets     |
| SAD VIOLIN      | Sad trombone / violin        |
| X-FILES         | Illuminati / X-Files theme   |
| ANIME WOW       | Anime wow reaction           |
| DUN DUN DUN     | Dramatic sting               |
| NANI?!          | Nani anime scream            |
| BONK            | Bonk SFX                     |
| TACO BELL       | Taco Bell bong               |
| WIN ERROR       | Windows error sound          |
| BA DUM TSS      | Drum rimshot                 |
| DIRECTED BY     | Robert B. Weide theme        |
| MGS ALERT       | Metal Gear Solid ! alert     |
| SPONGEBOB       | 2000 years later narration   |
| REVERB FART     | Classic meme fart            |

---

## 🎨 Design Decisions

- **Dark `#1a1f2e` background** — deep navy keeps colour-coded buttons vibrant and pop
- **Radial gradient domes** — each colour variant uses a 3-stop radial gradient (highlight → base → shadow) to simulate a spherical surface
- **`::before` specular highlight** — a small white ellipse near the top-left of every button replicates how light catches a glossy plastic dome
- **Hard `box-shadow` depth** — a solid `0 10px 0` shadow simulates the visible side/thickness of a mounted arcade button
- **Press mechanic** — `translateY(9px)` exactly cancels the depth shadow, so the button looks like it bottoms out against the panel

---

## 🤝 Contributing

Want to add more sounds or colour variants?

1. Add a `<button class="dome-btn [colour]" data-sound="my-sound">` in `index.html`
2. Add the matching `<audio id="my-sound" src="...">` tag
3. Add a `.dome-btn.[colour]` CSS rule in `style.css` following the existing gradient pattern

---

## 📄 License

MIT — free to use, remix, and share.
