import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// Serve the provided question images as-is (stand-in for the S3 question/<uuid>/ path).
export default defineConfig({ plugins: [vue()], publicDir: "question" });
