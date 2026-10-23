# seed-bible

The core library behind the [Seed Bible](https://seedbible.org) reader: its
Preact components, the managers that hold its state and talk to CasualOS,
and the API that extensions are written against.

Most people install this package to **build a Seed Bible extension**. The
quickest way to start one is the scaffolder, which sets up this package, the
build and test tooling, and a working example for you:

```bash
npm create seed-bible-extension@latest my-extension
```

See [`create-seed-bible-extension`](https://www.npmjs.com/package/create-seed-bible-extension)
and [`seed-bible-extension-scripts`](https://www.npmjs.com/package/seed-bible-extension-scripts).

## Install

```bash
npm install seed-bible preact @preact/signals
```

`preact` and `@preact/signals` are peer dependencies: your project provides
them, so Seed Bible and your code share one copy. Two copies of Preact break
its hooks.

| Tag      | Built from                       | Install                        |
| -------- | -------------------------------- | ------------------------------ |
| `latest` | Each release of the reader       | `npm install seed-bible`       |
| `alpha`  | Every change merged to `develop` | `npm install seed-bible@alpha` |

## Writing an extension

Extensions installed from a link run in their own sandboxed iframe and reach
Seed Bible only through the `sb` object, which checks every call against the
permissions the user granted.

```tsx
import { defineExtension } from "seed-bible/extensions";

export default defineExtension({
  // Runs once, in a hidden frame, when the extension starts.
  main: async (sb) => {
    await sb.tools.registerToolbarTool({
      id: "hello",
      title: "Hello",
      icon: { material: "waving_hand" },
      onSelect: () =>
        sb.panes.open({ view: "hello", placement: "side", title: "Hello" }),
    });
  },
  // One entry per kind of pane; each renders in a frame of its own.
  views: {
    hello: () => <p>Hello from a sandbox</p>,
  },
});
```

### Testing it

`createTestHost` runs an extension the way Seed Bible would, against a
stand-in for the app. It records what the extension does (tools, panes,
storage, toasts) so your test can check it.

```tsx
import { createTestHost } from "seed-bible/extensions/testing";
import extension from "./init";

it("adds a toolbar button that opens its pane", async () => {
  const host = await createTestHost(extension);
  await host.ready;

  await host.selectTool("hello");
  expect([...host.panes.values()]).toEqual([
    expect.objectContaining({ view: "hello" }),
  ]);

  host.dispose();
});
```

The full reference for `sb`, permissions, `extension.json` and the test host
is in [docs/extension-api.md](https://github.com/HelloAOLab/seed-bible/blob/develop/docs/extension-api.md).
The [developer guide](https://github.com/HelloAOLab/seed-bible/blob/develop/docs/developer-guide.md)
walks through it by example.

## Entry points

| Import                          | What's in it                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------ |
| `seed-bible/extensions`         | `defineExtension` and the types for sandboxed extensions.                                        |
| `seed-bible/extensions/testing` | `createTestHost`, for unit-testing a sandboxed extension.                                        |
| `seed-bible`                    | `registerExtension` and `getExtensionExports`, for trusted extensions that run inside the app.   |
| `seed-bible/managers`           | The managers that hold the reader's state (reading position, highlights, sessions, themes, ...). |
| `seed-bible/components`         | Shared Preact components and icons.                                                              |
| `seed-bible/i18n`               | The translation manager and language metadata.                                                   |
| `seed-bible/style.css`          | The stylesheet the components need.                                                              |

Trusted extensions (`registerExtension`) get the app's full internal state
instead of the permission-checked `sb` object, so they are only for
extensions that ship inside the Seed Bible repository. Use `defineExtension`
for anything installed from a link.

## Changelog and license

Changes are listed in the [Seed Bible changelog](https://github.com/HelloAOLab/seed-bible/blob/main/CHANGELOG.md).

Licensed under the [GNU Affero General Public License v3.0 or later](./LICENSE).
