# CALCULATOR INDIA

A mobile-friendly calculator with a warm, premium interface inspired by the Indian tricolour. CALCULATOR INDIA runs entirely in your browser—no server, account, dependencies, or paid hosting required.

## Features

- Basic arithmetic, parentheses, decimals, sign toggle, percentage, and keyboard input.
- Scientific functions: sine, cosine, tangent, square root, logarithms, powers, reciprocal, π, and e.
- Choose degrees or radians for trigonometric calculations.
- Calculation history, memory functions (MC, MR, M+, M−, MS), and clipboard copy/paste.
- Dark and light themes, Indian number grouping, optional button sound, and adjustable history size.
- Local persistence using browser storage. Your history and settings stay on your device.
- Responsive layout, accessible labels, and no build step or external JavaScript libraries.

## Run locally

Open `index.html` in a modern browser. For clipboard permissions and a more production-like preview, serve the folder locally:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Publish for free with GitHub Pages

1. Open this repository's **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select the `main` branch and `/ (root)` folder, then save.
4. After the Pages deployment finishes, open <https://ainextgen174-rgb.github.io/calculator-india/>.

The app is static, so no backend or paid hosting is needed. The Pages site is published by GitHub after Pages is enabled for the repository.

## Project files

- `index.html` — accessible app layout and stylesheet/script references.
- `styles.css` — responsive design, themes, and calculator UI.
- `app.js` — calculator parser, interaction, settings, clipboard, and local persistence.
- `assets/logo.svg` — scalable CALCULATOR INDIA logo.

## License

MIT. See [LICENSE](LICENSE).
