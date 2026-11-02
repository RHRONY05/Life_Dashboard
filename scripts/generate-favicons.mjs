import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const SVG_CONTENT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect x="20" y="20" width="472" height="472" rx="112" fill="#FFE45C" stroke="#141414" stroke-width="32"/>
  <path d="M140 266 L216 342 L372 170" fill="none" stroke="#141414" stroke-width="54" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// Also a standalone 32x32 SVG for src/app/icon.svg
const SVG_32 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <rect x="1.5" y="1.5" width="29" height="29" rx="7" fill="#FFE45C" stroke="#141414" stroke-width="2"/>
  <path d="M9 16.5 L13.5 21 L23 10.5" fill="none" stroke="#141414" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

async function main() {
  const publicDir = path.resolve("public");
  const appDir = path.resolve("src/app");

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // 1. Write SVGs
  fs.writeFileSync(path.join(appDir, "icon.svg"), SVG_32, "utf-8");
  fs.writeFileSync(path.join(publicDir, "icon.svg"), SVG_32, "utf-8");
  fs.writeFileSync(path.join(publicDir, "icon-512.svg"), SVG_CONTENT, "utf-8");
  console.log("SVGs written successfully.");

  // 2. Launch chromium to render high-res PNGs
  const browser = await chromium.launch();
  const page = await browser.newPage();

  async function renderPng(svg, size, outputPath) {
    const html = `<!DOCTYPE html>
    <html>
      <head>
        <style>
          * { margin: 0; padding: 0; }
          body { background: transparent; overflow: hidden; display: flex; align-items: center; justify-content: center; width: ${size}px; height: ${size}px; }
          svg { width: ${size}px; height: ${size}px; display: block; }
        </style>
      </head>
      <body>${svg}</body>
    </html>`;

    await page.setViewportSize({ width: size, height: size });
    await page.setContent(html);
    const buffer = await page.screenshot({ omitBackground: true, type: "png" });
    fs.writeFileSync(outputPath, buffer);
    return buffer;
  }

  const png16 = await renderPng(SVG_CONTENT, 16, path.join(publicDir, "favicon-16x16.png"));
  const png32 = await renderPng(SVG_CONTENT, 32, path.join(publicDir, "favicon-32x32.png"));
  const png48 = await renderPng(SVG_CONTENT, 48, path.join(publicDir, "favicon-48x48.png"));
  const png180 = await renderPng(SVG_CONTENT, 180, path.join(appDir, "apple-icon.png"));
  await renderPng(SVG_CONTENT, 180, path.join(publicDir, "apple-touch-icon.png"));
  await renderPng(SVG_CONTENT, 192, path.join(publicDir, "icon-192.png"));
  await renderPng(SVG_CONTENT, 512, path.join(publicDir, "icon-512.png"));
  await browser.close();

  console.log("PNGs rendered successfully.");

  // 3. Build a standard multi-resolution ICO file (16x16, 32x32, 48x48)
  // ICO header format:
  // Header: 2 bytes reserved (0), 2 bytes type (1 for ICO), 2 bytes image count
  // Directory entries (16 bytes each):
  //   width (1 byte), height (1 byte), palette (1 byte, 0), reserved (1 byte, 0),
  //   color planes (2 bytes, 1), bpp (2 bytes, 32), size (4 bytes), offset (4 bytes)
  // Image data (PNG compressed format is fully supported in ICO)
  const images = [
    { width: 16, height: 16, buffer: png16 },
    { width: 32, height: 32, buffer: png32 },
    { width: 48, height: 48, buffer: png48 },
  ];

  const headerSize = 6;
  const dirEntrySize = 16;
  const totalHeaderSize = headerSize + dirEntrySize * images.length;

  let currentOffset = totalHeaderSize;
  const dirBuffers = [];
  const imageBuffers = [];

  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.width === 256 ? 0 : img.width, 0);
    entry.writeUInt8(img.height === 256 ? 0 : img.height, 1);
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(img.buffer.length, 8); // size
    entry.writeUInt32LE(currentOffset, 12); // offset

    dirBuffers.push(entry);
    imageBuffers.push(img.buffer);
    currentOffset += img.buffer.length;
  }

  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // reserved
  icoHeader.writeUInt16LE(1, 2); // ICO type
  icoHeader.writeUInt16LE(images.length, 4); // count

  const icoBuffer = Buffer.concat([icoHeader, ...dirBuffers, ...imageBuffers]);
  fs.writeFileSync(path.join(appDir, "favicon.ico"), icoBuffer);
  fs.writeFileSync(path.join(publicDir, "favicon.ico"), icoBuffer);

  console.log("favicon.ico generated at both src/app/favicon.ico and public/favicon.ico");

  // 4. Web App Manifest
  const manifest = {
    name: "Life Dashboard",
    short_name: "Life",
    description: "Personal daily dashboard for Muhammad Rony",
    start_url: "/",
    display: "standalone",
    background_color: "#FBFAF6",
    theme_color: "#FFE45C",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };

  fs.writeFileSync(
    path.join(publicDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf-8"
  );
  console.log("manifest.json generated in public/");
}

main().catch(console.error);
