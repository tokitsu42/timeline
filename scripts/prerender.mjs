import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { render } from "../.ssr/entry-server.js";

const templatePath = resolve("dist/index.html");
const template = await readFile(templatePath, "utf8");

const pages = [
  { pathname: "/timeline/", output: "dist/index.html" },
  { pathname: "/timeline/about", output: "dist/about.html" },
  { pathname: "/timeline/about", output: "dist/about/index.html" },
  { pathname: "/timeline/__not-found__", output: "dist/404.html" },
];

for (const page of pages) {
  const outputPath = resolve(page.output);
  const html = template.replace(
    '<div id="root"></div>',
    `<div id="root">${render(page.pathname)}</div>`,
  );

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html);
}

await rm(resolve(".ssr"), { recursive: true, force: true });
