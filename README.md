# Feel The Wrath — Windows app (Electron)

## One-time setup
1. Create a **public** GitHub repo named `feel-the-wrath` under `Aces22378-Dev`
   (if you use another name, change `"publish"` in package.json and `RELEASES_URL` in main.js).
2. Put everything in this folder into it and push (`node_modules` and `dist` are ignored).

## Releasing a new version
1. Put the newest `start.html` in `app\index.html`.
2. Bump the version in **two** places to the same number, e.g. `0.5.1`:
   - `"version"` in `package.json`
   - `GAME_VERSION` in `app\index.html` (search for `GAME_VERSION`)
3. Commit, push, then tag it:
   ```bat
   git tag v0.5.1
   git push origin v0.5.1
   ```
4. GitHub Actions (the "Release" workflow) builds `FeelTheWrath-Setup-0.5.1.exe` on Windows and publishes it.
   Wait for the green check under the repo's **Actions** tab.
5. To force every player onto it, set `MIN_CLIENT_VERSION = "0.5.1"` in `ftw-server\wrangler.toml`
   and run `npx wrangler deploy`. Do this **after** the release exists and the website has the new HTML.

## What players see
- On launch (and every 30 minutes) the game checks GitHub. If there's a newer release, the game is blocked with
  "You can not continue with a outdated version. Click "Update" to update your version."
- Update downloads the new installer, installs it silently, and restarts the game.
- The server also refuses versions below `MIN_CLIENT_VERSION`, so old copies are blocked even if they skip the check.

## Build locally (on Windows)
```bat
npm install
npm run dist
```
Output: `dist\FeelTheWrath-Setup-<version>.exe`.

## Discord Rich Presence
Set `DISCORD_CLIENT_ID` and `ITCH_URL` at the top of `main.js`.

F11 toggles fullscreen. The game talks to https://ftw-server.minecraftmobileexplorer.workers.dev (API_BASE in index.html).
