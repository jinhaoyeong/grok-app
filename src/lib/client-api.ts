export async function postJson<T>(
  path: string,
  body: unknown,
  apiKey?: string,
): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "x-openai-key": apiKey } : {}),
    },
    body: JSON.stringify(body),
  });

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return data as T;
}

export async function getStatus(): Promise<{ hasServerKey: boolean }> {
  const response = await fetch("/api/status");
  if (!response.ok) return { hasServerKey: false };
  return (await response.json()) as { hasServerKey: boolean };
}
