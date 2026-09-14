import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sorted",
    short_name: "Sorted",
    description:
      "Dump the mess. Keep the day. Tasks, groceries, replies, and meals from your OpenAI credit.",
    start_url: "/",
    display: "standalone",
    background_color: "#F4EEE4",
    theme_color: "#F4EEE4",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
