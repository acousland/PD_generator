# Chat Script Player

A lightweight ChatGPT-like UI that plays back a scripted conversation from a JSON file. Built with React, Vite, and Framer Motion.

## Script format

Create a JSON file matching this shape:

{
  "title": "Optional title",
  "options": {
    "typingSpeed": 35,
    "messageDelayMs": 500
  },
  "messages": [
    { "role": "user", "content": "Hello!" },
    { "role": "assistant", "content": "Hi there — how can I help?" }
  ]
}

Roles can be `user` or `assistant` (a `system` role will render like assistant).

## Put your script in the repo

Place your file under `public/scripts/` (e.g. `public/scripts/my-demo.json`) and set the path in the input box at the top of the app, or replace `public/scripts/demo.json`.

## Run locally

1. Install dependencies
2. Start the dev server

### Scripts

Use these commands (zsh/macOS):

```sh
npm install
npm run dev
```

Open the URL shown (usually http://localhost:5173).

## Controls

- Play/Pause/Restart
- Skip typing of current message or jump Next
- Adjust typing speed and delay between messages
- Load a JSON file from disk or fetch from a path

## Notes

- This is client-only; no backend required.
- For static hosting, run `npm run build` and serve the `dist/` folder.
