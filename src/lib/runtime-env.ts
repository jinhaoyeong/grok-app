export function envString(name: string): string | undefined {
  const value = process.env[name];
  return typeof value === "string" ? value : undefined;
}

export function hostedOnVercel(): boolean {
  return envString("VERCEL") === "1" || Boolean(envString("VERCEL_ENV"));
}
