# Sorted

A daily desk for messy real life. Open it in the morning, tick the repeating list, log money, pick dinner, close the night. Dump a thought, a fridge photo, a receipt, or a WhatsApp thread when something lands — billed to **your** OpenAI credit.

This is not another chat window. Chat disappears. The day stays on this device.

## Why this exists

Most days are not a blank prompt. They are:

- the same five checks you forget unless they sit in front of you
- coffee and Grab you meant to track
- a fridge you do not want to think about at 7pm
- a family text you still have not answered
- a small decision that is eating the evening

Sorted is built for those, on a phone, in under a minute. The OpenAI key is optional for the daily loop. You need it when you dump chaos, write a reply, or ask it to plan the next 90 minutes.

## Daily loop

1. **Today** — repeating checks reset at local midnight. Add a task, a buy, or a spend in one field. Tick the next three jobs. That is the morning.
2. **Tonight** — pick dinner from the grocery list, a fridge dump, or a tired default so 7pm is not a negotiation.
3. **Money** — `6.50 coffee` or a receipt dump. Totals live on this date, not in a chat.
4. **Close the day** — one wrap, streak on the week strip, stop. Yesterday still open? Close it or skip it so today is clean.
5. **Dump / Reply / Decide** — only when you have a mess, a message, or a fork. Nothing lands on the board until you keep it.

Luna is the default model so ordinary days stay cheap. Terra and Sol are there when a photo or dump is actually hard.

## Run it

You need Node 20+ and, for AI actions, an OpenAI API key from [platform.openai.com/api-keys](https://platform.openai.com/api-keys).

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Habits, spends, dinner, and close-the-day work immediately. For dumps and replies, go to **Settings** and paste the key. It stays in this browser and is sent only to your own Sorted server, which calls OpenAI.

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

The board and the day log live in `localStorage` on this device (`sorted.board.v1`, `sorted.life.v1`, `sorted.settings.v1`). There is no account and no database. Clearing the site data clears the day. Export from Settings if you want a backup.
