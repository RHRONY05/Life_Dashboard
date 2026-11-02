import fs from "fs";
import path from "path";

const spritePath = path.resolve(".agent/design/illustrations/sprite.svg");
const content = fs.readFileSync(spritePath, "utf8");

const regex = /<symbol id="([^"]+)" viewBox="([^"]+)">([\s\S]*?)<\/symbol>/g;
let match;
const illustrations = {};

while ((match = regex.exec(content)) !== null) {
  const [, id, viewBox, inner] = match;
  // Convert style="..." to JSX style or SVG presentation attributes
  // Replace style="fill:var(--illus-a)" with style={{ fill: 'var(--illus-a)' }} or standard attrs
  // Actually, converting style="k:v;k2:v2" to style object or inline strings:
  illustrations[id] = { viewBox, inner: inner.trim() };
}

console.log(`Parsed ${Object.keys(illustrations).length} illustrations`);

// Convert SVG inner HTML to JSX
function svgToJsx(html) {
  return html
    .replace(/style="([^"]+)"/g, (_, styles) => {
      const obj = {};
      styles.split(";").forEach((s) => {
        if (!s.trim()) return;
        const [k, ...v] = s.split(":");
        const val = v.join(":").trim();
        const camelK = k
          .trim()
          .replace(/-([a-z])/g, (_, char) => char.toUpperCase());
        obj[camelK] = val;
      });
      return `style={${JSON.stringify(obj)}}`;
    })
    .replace(/stroke-width/g, "strokeWidth")
    .replace(/stroke-linecap/g, "strokeLinecap")
    .replace(/stroke-linejoin/g, "strokeLinejoin")
    .replace(/stroke-dasharray/g, "strokeDasharray");
}

let out = `import React from "react";
import clsx from "clsx";

export type IllustrationName =
${Object.keys(illustrations)
  .map((k) => `  | "${k}"`)
  .join("\n")};

interface IllustrationProps extends React.SVGProps<SVGSVGElement> {
  name: IllustrationName;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Illustration({ name, size = "md", className, ...props }: IllustrationProps) {
  const sizeClasses = {
    sm: "w-[96px] h-[72px]",
    md: "w-[140px] h-[105px]",
    lg: "w-[200px] h-[150px]",
  };

  switch (name) {
`;

for (const [id, data] of Object.entries(illustrations)) {
  out += `    case "${id}":
      return (
        <svg
          viewBox="${data.viewBox}"
          aria-hidden="true"
          className={clsx("illus", sizeClasses[size], className)}
          {...props}
        >
          ${svgToJsx(data.inner)}
        </svg>
      );
`;
}

out += `    default:
      return null;
  }
}
`;

fs.writeFileSync("src/components/illustrations/Illustration.tsx", out, "utf8");

// DayGlyph component
let glyphOut = `import React from "react";
import clsx from "clsx";

export type DayGlyphKind = "yesterday" | "today" | "tomorrow";

interface DayGlyphProps extends React.SVGProps<SVGSVGElement> {
  kind: DayGlyphKind;
  className?: string;
}

export function DayGlyph({ kind, className, ...props }: DayGlyphProps) {
  switch (kind) {
    case "yesterday":
      return (
        <svg
          viewBox="${illustrations["day-yesterday"]?.viewBox || "0 0 32 32"}"
          aria-hidden="true"
          className={clsx("day-glyph", className)}
          {...props}
        >
          ${svgToJsx(illustrations["day-yesterday"]?.inner || "")}
        </svg>
      );
    case "today":
      return (
        <svg
          viewBox="${illustrations["day-today"]?.viewBox || "0 0 32 32"}"
          aria-hidden="true"
          className={clsx("day-glyph", className)}
          {...props}
        >
          ${svgToJsx(illustrations["day-today"]?.inner || "")}
        </svg>
      );
    case "tomorrow":
      return (
        <svg
          viewBox="${illustrations["day-tomorrow"]?.viewBox || "0 0 32 32"}"
          aria-hidden="true"
          className={clsx("day-glyph", className)}
          {...props}
        >
          ${svgToJsx(illustrations["day-tomorrow"]?.inner || "")}
        </svg>
      );
    default:
      return null;
  }
}
`;

fs.writeFileSync("src/components/illustrations/DayGlyph.tsx", glyphOut, "utf8");

let indexOut = `export { Illustration } from "./Illustration";
export type { IllustrationName } from "./Illustration";
export { DayGlyph } from "./DayGlyph";
export type { DayGlyphKind } from "./DayGlyph";
`;
fs.writeFileSync("src/components/illustrations/index.ts", indexOut, "utf8");

console.log("Successfully generated Illustration, DayGlyph, and index.ts");
