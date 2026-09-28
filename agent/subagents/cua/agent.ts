import { defineAgent } from "eve";

export default defineAgent({
  defaultTools: false,
  description:
    "Drive native apps on your Mac. Launch apps, read windows, click, type, and run the other cua-driver tools.",
  model: "google/gemini-2.5-flash",
});
