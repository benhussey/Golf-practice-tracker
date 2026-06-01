# Golf Practice Tracker — Your Personal App

This is a complete, standalone version of your practice tracker. Once deployed, it
installs to your phone's home screen like a real app, stores all your data on your
phone (so it never disappears), and can be updated anytime by replacing one file.

---

## What's in here

```
golf-tracker-app/
├── index.html            ← app entry page
├── package.json          ← dependency list
├── vite.config.js        ← build + PWA (home screen) config
├── .gitignore
├── public/
│   ├── favicon.svg
│   ├── icon-192.png      ← home screen icon
│   └── icon-512.png
└── src/
    ├── App.jsx           ← THE APP. This is the only file Claude edits on updates.
    ├── main.jsx
    └── index.css
```

Your data lives in your phone browser's localStorage under the key
`golf-sessions-v2`. It is never stored in the code, so updating the app never
touches your saved sessions.

---

## One-time setup: get it on your phone

You don't need to be a developer. Pick the easiest path for you.

### Option A — Vercel drag & drop (no GitHub, simplest)

1. Go to **https://vercel.com** and sign up (free).
2. On your computer, open this `golf-tracker-app` folder.
3. In a terminal inside the folder, run once:
   ```
   npm install
   npm run build
   ```
   This creates a `dist/` folder.
4. Go to **https://vercel.com/new**, and drag the **whole project folder** in,
   OR install the Vercel CLI (`npm i -g vercel`) and just run `vercel` in the folder.
5. Vercel gives you a URL like `https://golf-practice-tracker.vercel.app`.

### Option B — GitHub + Vercel (best for easy updates)

1. Create a free GitHub account, make a new repository.
2. Upload this whole folder to the repo (the GitHub website lets you drag files in).
3. At **https://vercel.com/new**, click "Import" and pick your repo.
4. Vercel auto-detects Vite. Click **Deploy**. Done.
5. Now whenever you change a file in GitHub, Vercel redeploys automatically.

### Option C — Netlify (alternative to Vercel)

1. Run `npm install` then `npm run build` in the folder.
2. Go to **https://app.netlify.com/drop** and drag the `dist/` folder onto it.
3. You get an instant URL.

---

## Add it to your home screen

On your phone, open the deployed URL in your browser:

- **iPhone (Safari):** tap the Share button → **Add to Home Screen**.
- **Android (Chrome):** tap the ⋮ menu → **Install app** / **Add to Home Screen**.

You'll get a real app icon. It opens full-screen with no browser bars, works
offline, and keeps all your data on the device.

---

## How updates work

When you ask Claude to improve the app, Claude gives you a new `src/App.jsx`.

- **Option A / C:** replace `src/App.jsx`, run `npm run build` again, redeploy.
- **Option B (GitHub):** replace `src/App.jsx` in your repo — Vercel redeploys
  automatically within a minute.

Your saved sessions stay intact through every update because they live in your
phone, not in the app code.

---

## Backups (extra safety)

Inside the app, go to the **Progress** tab → **Backup & Restore**:

- **Export backup** saves a `.json` file of all your sessions.
- **Import backup** restores from that file (merges, no duplicates).

Do an export now and then and store it somewhere safe (email, cloud drive). That
way your data survives even if you get a new phone or clear your browser.

---

## Running it locally (optional)

To preview on your computer before deploying:

```
npm install
npm run dev
```

Then open the local URL it prints (usually http://localhost:5173).
