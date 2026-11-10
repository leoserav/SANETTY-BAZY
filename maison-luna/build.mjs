import { mkdir, readFile, writeFile, copyFile, readdir } from "node:fs/promises";
const types = {
  html: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  webp: "image/webp",
  webm: "video/webm"
};
const paths = ["index.html", "styles.css", "shop.js", ...(await readdir("public/assets")).map((file) => "assets/" + file)];
const assets = Object.fromEntries(await Promise.all(paths.map(async (path) => [
  "/" + path, [types[path.split(".").at(-1)], (await readFile("public/" + path)).toString("base64")]
])));
await mkdir("dist/server", { recursive: true });
await mkdir("dist/.openai", { recursive: true });
await writeFile("dist/server/index.js", "const assets = " + JSON.stringify(assets) + ";\n" + await readFile("worker.mjs", "utf8"));
await copyFile(".openai/hosting.json", "dist/.openai/hosting.json");
