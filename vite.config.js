import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base works on GitHub Pages under any repo name (no router, hash-based views).
export default defineConfig({
  base: "./",
  plugins: [react()],
});
