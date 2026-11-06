# CALCULATOR INDIA

A mobile-friendly calculator with a warm, premium interface inspired by the Indian tricolour. CALCULATOR INDIA runs in your browser—no server, account, dependencies, or paid hosting required.

## Features

- Basic arithmetic, parentheses, decimals, sign toggle, percentage, and keyboard input.
- Scientific functions: sine, cosine, tangent, square root, logarithms, powers, reciprocal, π, and e.
- Select degrees or radians for trigonometric calculations.
- Calculation history, memory functions (MC, MR, M+, M−, MS), and clipboard copy/paste.
- Dark/light themes, Indian number formatting, optional key sound, and adjustable history size.
- Local persistence: history, memory, theme, and settings are stored in this browser.
- Responsive and accessible layout, no build step, and no external JavaScript libraries.

## Run locally

Open `index.html` in a modern browser. To serve the app locally (also useful for clipboard permissions), run:

```sh
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

## Publish for free with GitHub Pages

1. Open this repository's **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select `main` and the `/ (root)` folder, then save.
4. Wait for the Pages deployment to finish, then open <https://ainextgen174-rgb.github.io/calculator-india/>.

GitHub Pages is free for this static site. Pages must be enabled in repository settings before the URL is available.

## Project files

- `index.html` — app layout and stylesheet/script references.
- `styles.css` — responsive design and dark/light themes.
- `app.js` — safe expression parser, calculator controls, history, clipboard, and local persistence.
- `assets/logo.svg` — scalable CALCULATOR INDIA logo.

## License

MIT. See [LICENSE](LICENSE).
