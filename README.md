# Sorted

A daily desk for messy real life. Dump a thought, a fridge photo, a receipt, or a WhatsApp thread. Sorted files it into tasks, groceries, drafts, meals, and notes — billed to **your** OpenAI credit.

This is not another chat window. Chat disappears. The board stays on this device.

## Why this exists

Most days are not a blank prompt. They are:

- a family text you still have not answered
- a fridge you do not want to think about
- five errands buried in your head
- a small decision that is eating the evening

Sorted is built for those, on a phone, in under a minute.

## Daily loop

1. **Dump** — paste chaos or take a photo.
2. **Keep what you want** — nothing lands on the board until you accept it.
3. **Today** — check off tasks and groceries, copy a draft, add an event to your calendar.
4. **Reply** — three sendable tones for the awkward message.
5. **Decide** — one pick and a first step, not a TED talk.

Luna is the default model so ordinary days stay cheap. Terra and Sol are there when a photo or dump is actually hard.

## Run it

You need Node 20+ and an OpenAI API key from [platform.openai.com/api-keys](https://platform.openai.com/api-keys).

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), go to **Settings**, paste the key. It stays in this browser and is sent only to your own Sorted server, which calls OpenAI.

To keep the key off the device entirely:

```bash
cp .env.example .env.local
```

Put `OPENAI_API_KEY` in `.env.local`, then restart `pnpm dev`.

On a phone, add Sorted to the home screen. It is a standalone page.

## Deploy

Host it somewhere only you can reach (Vercel with deployment protection is enough). Set `OPENAI_API_KEY` in that environment. Do not put a secret in `NEXT_PUBLIC_*`.

```bash
pnpm build
```

## Privacy

The board lives in `localStorage` on this device. There is no account and no database. Clearing the site data clears the board. Export from Settings if you want a backup.
