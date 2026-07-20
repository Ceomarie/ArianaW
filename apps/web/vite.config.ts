import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves a project site under /<repo>/, so assets need that base
// prefix. Vercel/Netlify serve at the root and set nothing, so this defaults to
// "/". BASE_PATH is provided by the Pages workflow (from actions/configure-pages).
const raw = process.env.BASE_PATH?.trim();
const base = !raw || raw === "/" ? "/" : raw.endsWith("/") ? raw : `${raw}/`;

export default defineConfig({
  base,
  plugins: [react()],
});
