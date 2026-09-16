export const UNAVAILABLE = "Couldn't do that right now.";

export type AppStatus = {
  locked: boolean;
  ai: boolean;
  gate: boolean;
};

function clientSafeMessage(message: string): string {
  if (/sk-[a-z0-9_-]{8,}/i.test(message) || /api[\s_-]?key/i.test(message) || /bearer\s+/i.test(message)) {
    return UNAVAILABLE;
  }
  return message;
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    credentials: "same-origin",
    cache: "no-store",
  });

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof data.error === "string"
        ? clientSafeMessage(data.error)
        : UNAVAILABLE;
    throw new Error(message);
  }
  return data as T;
}

const LOCKED_STATUS: AppStatus = { locked: true, ai: false, gate: true };

export async function getStatus(): Promise<AppStatus> {
  try {
    const response = await fetch("/api/status", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!response.ok) return LOCKED_STATUS;
    const data = (await response.json()) as Partial<AppStatus>;
    if (typeof data.locked !== "boolean") return LOCKED_STATUS;
    return {
      locked: data.locked,
      ai: data.locked ? false : Boolean(data.ai),
      gate: Boolean(data.gate),
    };
  } catch {
    return LOCKED_STATUS;
  }
}

export async function unlockApp(password: string): Promise<void> {
  const challenge = await fetch("/api/unlock/challenge", {
    credentials: "same-origin",
    cache: "no-store",
  });
  const challengeData: unknown = await challenge.json().catch(() => null);
  const nonce =
    challenge.ok &&
    challengeData &&
    typeof challengeData === "object" &&
    "nonce" in challengeData &&
    typeof challengeData.nonce === "string"
      ? challengeData.nonce
      : "";
  if (!nonce) {
    throw new Error(UNAVAILABLE);
  }
  const proof = await sha256Hex(`${nonce}\0${password}`);
  await postJson("/api/unlock", { proof });
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function lockApp(): Promise<void> {
  await postJson("/api/lock", {});
}
