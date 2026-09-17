import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

export default defineConfig({
  main: {
    // externalizeDepsPlugin only reads package.json's "dependencies" field
    // by default — @nextlayer/desktop-native lives in "optionalDependencies"
    // instead (so a plain `npm install` doesn't try to build this Windows-
    // only native addon on Linux/Mac), so it needs to be listed explicitly
    // here or Rollup tries to bundle its compiled .node-backed CJS export
    // itself and fails ("default is not exported by native/index.js").
    plugins: [externalizeDepsPlugin({ include: ["@nextlayer/desktop-native"] })],
    build: { outDir: "out/main" },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: { outDir: "out/preload" },
  },
  renderer: {
    root: "src/renderer",
    resolve: {
      alias: { "@": resolve(__dirname, "src/renderer/src") },
    },
    plugins: [react()],
    build: { outDir: "out/renderer" },
  },
});
