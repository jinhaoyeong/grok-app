import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sorted",
    short_name: "Sorted",
    description:
      "Open it in the morning. Close it at night. Checks, dinner, money, and dumps.",
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
