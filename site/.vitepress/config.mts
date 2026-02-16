import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitepress";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const sidebarPath = resolve(__dirname, "sidebar.json");
const sidebar = existsSync(sidebarPath) ? JSON.parse(readFileSync(sidebarPath, "utf-8")) : {};

export default defineConfig({
  title: "BIND Trust Network",
  description:
    "Public trust network directory for the insurance industry — cryptographic key registry for BIND resource verification.",
  head: [
    ["link", { rel: "icon", type: "image/png", href: "/favicon-96x96.png", sizes: "96x96" }],
    ["link", { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
    ["link", { rel: "shortcut icon", href: "/favicon.ico" }],
    ["link", { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" }],
    ["link", { rel: "manifest", href: "/site.webmanifest" }],
  ],
  themeConfig: {
    nav: [
      { text: "Directory", link: "/participants/" },
      { text: "About", link: "/about" },
      { text: "Join", link: "/join" },
      { text: "BIND Standard", link: "https://bind-standard.org" },
    ],
    sidebar,
    search: { provider: "local" },
    socialLinks: [{ icon: "github", link: "https://github.com/bind-standard/bind-directory" }],
  },
});
