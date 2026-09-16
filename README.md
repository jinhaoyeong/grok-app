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
cp .env.example .env.local
```

Put `OPENAI_API_KEY` in `.env.local`. Never put it in a `NEXT_PUBLIC_*` variable, and never paste it into the app. Restart after changing env files:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Habits, spends, dinner, and close-the-day work immediately. Dumps, replies, and AI planning use the server key only.

On a phone, add Sorted to the home screen. It is a standalone page.

## Deploy on Vercel

The key stays on Vercel’s server environment. It is not built into the browser bundle.

In the Vercel project: **Settings → Environment Variables**. Add both, mark them **Sensitive**, and never prefix them with `NEXT_PUBLIC_`:

| Name | Production | Preview | Notes |
| --- | --- | --- | --- |
| `OPENAI_API_KEY` | Required | Leave empty if you can | Server only. Preview URLs are easier to stumble on, so keeping the key off Preview avoids surprise usage. |
| `APP_ACCESS_SECRET` | Required | Required if Preview has the key | Your passcode, **12+ characters**, **different** from the API key. On Vercel nobody can use AI without this. |
| `APPROVED_ACCESS_CODES` | Optional | Optional | Comma-separated extra passcodes, each **12+ characters**. Add one when you approve someone. Remove it to cut them off. |

After saving env vars, redeploy. You unlock with `APP_ACCESS_SECRET`. People you approve unlock with their own code from `APPROVED_ACCESS_CODES`. Sessions expire in 7 days, are host-only cookies, and die if you delete that person’s code. The API key never goes to the browser.

A visitor who only has the public URL cannot call Dump / Reply / Decide. Direct API calls without a valid session are blocked twice (proxy + route). Middleware skip headers are rejected. API responses are not CDN-cached, so one unlocked status cannot be reused for everyone. Stolen cookies stop working after expiry or after you rotate/remove the code.

Also turn on **Deployment Protection** (Project → Settings → Deployment Protection) for Preview, or for all deployments if your plan allows. That stops strangers from loading the site at all.

Do not paste secrets into Git, `.env`, or `NEXT_PUBLIC_*`. `.env.local` is gitignored and is only for your laptop.

## Privacy and key safety

`OPENAI_API_KEY` is read only on the server. The browser, DevTools, Network panel, and `localStorage` never receive it. Older keys that were pasted into Settings are wiped on the next load.

The board and the day log live in `localStorage` on this device (`sorted.board.v1`, `sorted.life.v1`, `sorted.settings.v2`). There is no account and no database. Clearing the site data clears the day. Export from Settings if you want a backup.
