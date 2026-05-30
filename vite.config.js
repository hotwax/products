/// <reference types="vitest" />

import legacy from "@vitejs/plugin-legacy"
import vue from "@vitejs/plugin-vue"
import path from "path"
import { defineConfig } from "vite"
import { versionInfoUtil } from "../accxui/common/utils/versionInfoUtil"
import { localMoquiDiscoveryPlugin } from "../accxui/common/vite/localMoquiDiscoveryPlugin"
import pkg from "./package.json"

export default defineConfig({
  plugins: [
    vue(),
    legacy(),
    localMoquiDiscoveryPlugin()
  ],
  define: {
    "import.meta.env.VITE_VERSION_INFO": JSON.stringify(JSON.stringify(versionInfoUtil.getVersionInfo(pkg.version)))
  },
  resolve: {
    dedupe: ["vue", "pinia"],
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@common": path.resolve(__dirname, "../accxui/common")
    }
  },
  test: {
    globals: true,
    environment: "jsdom"
  }
})
