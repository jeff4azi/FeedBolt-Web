import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      registerType: "autoUpdate",
      injectRegister: "auto",
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,jpg,png,svg,woff2}"],
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
      manifest: {
        name: "FeedBolt",
        short_name: "FeedBolt",
        description: "Share posts, follow people, and stay connected.",
        start_url: "/feed",
        display: "standalone",
        background_color: "#0B0B0F",
        theme_color: "#0B0B0F",
        orientation: "portrait-primary",
        icons: [
          {
            src: "/FeedBolt.jpg",
            sizes: "192x192",
            type: "image/jpeg",
          },
          {
            src: "/FeedBolt.jpg",
            sizes: "512x512",
            type: "image/jpeg",
          },
        ],
      },
    }),
  ],
  server: {
    port: 5175,
  },
});
