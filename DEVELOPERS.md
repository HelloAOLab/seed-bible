## Upgrade Notes

### Installation

1. Make sure you have Node 24.15.0 installed
2. Make sure you have [Bun](https://bun.sh/) installed
3. Run `pnpm install`

### Running in Dev

1. Run `pnpm dev`
2. Load `http://localhost:3002` in a web browser
3. You should see the Seed Bible load
4. It will hot-reload changes that you make when you edit and save files. Refresh if some changes aren't loaded properly.

### Debugging in Dev

You can now launch the VSCode debugger and step through code.

1. Run `pnpm dev`
2. In the "Run and Debug" window, select the "Launch Chrome" option and click "Start Debugging"
3. You should see the Seed Bible load in a new window.
4. You can now place breakpoints in VSCode and Chrome will pause when one is hit.

### Extensions

Extensions now need the following:

- a `package.json` file at the root
- a `index.ts` file at the root
- a `extension.json` file with metadata

#### Third-party extensions loaded from a URL

An extension does not have to live in this repo. `loadExtension({ url, meta })`
imports a plain ES module from any URL (the server has to allow cross-origin
requests) and calls its default export:

```js
import { registerExtension } from "seed-bible";

export default function initMyExtension() {
  registerExtension({
    id: "my-extension",
    init: function* (context) {
      yield context.tools.registerToolbarTool({
        /* ... */
      });
    },
  });
}
```

The default export must be safe to call more than once — the browser evaluates a
module only once per URL, so reinstalling an extension re-invokes this function
rather than re-running the file.

Because the browser loads the file directly, with no bundler involved, it can
only resolve the bare specifiers the page publishes in its import map:

| Specifier               | What it gives you                                     |
| ----------------------- | ----------------------------------------------------- |
| `seed-bible`            | `registerExtension`, `getExtensionExports`, and types |
| `seed-bible/components` | Shared components (`MaterialIcon`, `PortalComponent`) |
| `seed-bible/i18n`       | `useI18n` and the translation helpers                 |
| `preact`                | The app's preact instance                             |
| `preact/hooks`          | ditto                                                 |
| `preact/jsx-runtime`    | ditto (what compiled JSX imports on your behalf)      |
| `preact/compat`         | ditto                                                 |
| `@preact/signals`       | The app's signals runtime                             |

Everything else — third-party npm packages, your own modules — has to be bundled
into the file you serve.

Importing `preact` and `@preact/signals` from this list rather than shipping your
own copy is not optional: two preact instances on one page break hooks with
`Cannot read properties of undefined (reading '__H')`, and two signals runtimes
track subscriptions separately, so writes never re-render the host's components.

The list is defined in `script/lib/importMap.ts`; each entry is served by a
re-export shim in `standalone/extension-api/`.

### Patterns

If you need to display content inside the gridPortal or mapPortal, then you need to create a pattern.
They are stored in the `patterns` folder.

Each pattern needs:

- a `pattern.json` file
- a `extra.aux` file

To use a pattern, simply import it with the following:

```typescript
import myPattern from "virtual:@pattern/my-pattern";
```

Then pass the pattern to `openPane()`:

```typescript
context.panes.openPane({
  type: "detached",
  mapPortal: "map",
  pattern: myPattern,
  inst: uuid(),
  query: {
    myData: "hi!",
  },
});
```
