import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: ".output",
  },
  envPrefix: "PUBLIC_",
  plugins: [
    devtools(),
    // cloudflare({ viteEnvironment: { name: "ssr" } }),
    nitro({
      rollupConfig: {
        external: [/^@sentry\//],
      },
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 3020,
    strictPort: true,
    watch: {
      ignored: [
        "**/.codegraphcontext/**",
        "**/.opencode/**",
        "**/.sandcastle/**",
        "**/.agents/**",
      ],
    },
  },
});
