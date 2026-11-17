import path from "node:path";
import type { Plugin } from "vite";

/**
 * For a library build with `cssCodeSplit`. Vite writes each chunk's CSS to a
 * file of its own but leaves nothing in the JavaScript that points to it, so
 * a consumer bundling the library would get its components without their
 * styles. This adds an `import "./X.css"` to every chunk that has CSS, the
 * way the source imports it, so whatever bundles a component also bundles
 * its CSS (for `seed-bible`, the extension build tool then carries it into
 * the sandboxed frame).
 *
 * It also writes `style.css`, every chunk's CSS in one file, for anyone
 * loading the stylesheet themselves. `firstEntry` names the entry whose CSS
 * goes first, such as foundation styles the rest build on.
 */
export function libraryCssImportsPlugin(
  options: { firstEntry?: string } = {}
): Plugin {
  return {
    name: "seed-bible-library-css-imports",
    apply: "build",
    enforce: "post",
    generateBundle(_outputOptions, bundle) {
      const source = (name: string) => {
        const asset = bundle[name];
        if (asset?.type !== "asset") return "";
        return typeof asset.source === "string"
          ? asset.source
          : new TextDecoder().decode(asset.source);
      };
      const sheets: string[] = [];
      for (const file of Object.values(bundle)) {
        if (file.type !== "chunk") continue;
        const css = [...(file.viteMetadata?.importedCss ?? [])];
        if (css.length === 0) continue;
        const imports = css
          .map((name) => {
            const relative = path.posix.relative(
              path.posix.dirname(file.fileName),
              name
            );
            return `import ${JSON.stringify(
              relative.startsWith(".") ? relative : `./${relative}`
            )};`;
          })
          .join("");
        // Before the chunk's other imports, as each component imports its
        // CSS before the components it uses, so a consumer gets the CSS in
        // the order the app loads it. On a line of its own, with the chunk's
        // source map moved down one line to match.
        file.code = `${imports}\n${file.code}`;
        const map = bundle[`${file.fileName}.map`];
        if (map?.type === "asset") {
          const json = JSON.parse(source(map.fileName));
          json.mappings = `;${json.mappings}`;
          map.source = JSON.stringify(json);
        }
        const added = css.filter((name) => !sheets.includes(name));
        if (file.isEntry && file.name === options.firstEntry) {
          sheets.unshift(...added);
        } else {
          sheets.push(...added);
        }
      }

      this.emitFile({
        type: "asset",
        fileName: "style.css",
        source: sheets.map(source).join("\n"),
      });
    },
  };
}
