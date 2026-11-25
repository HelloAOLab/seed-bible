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

### Developer tools

Settings → Developer lists switchable tools for working on Seed Bible.

- **Turning them on:** always shown in `pnpm dev`. On alpha and production, tap the version number at the bottom of Settings seven times, or open any page with `?devTools`. "Hide developer settings" locks them again. The iPhone and Android apps don't have them.
- **Adding a tool:** add an entry to `ALL_DEV_TOOLS` in `packages/seed-bible/seed-bible/app/devTools/devTools.ts` with a `start` and a `stop`. Set `safeInProduction: true` only if it's harmless for any user to switch on; unmarked tools only show in dev builds, but their code still ships in production's on-demand chunk, so never put anything sensitive in one.
- **Build check:** `pnpm build:client` and `pnpm build:native` fail if developer-tools code reaches what production loads at startup, or the native apps at all. If a new tool's code contains none of the markers in `script/lib/devToolsBundleCheck.ts`, add one.

### Extensions

Extensions now need the following:

- a `package.json` file at the root
- a `index.ts` file at the root
- a `extension.json` file with metadata

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

### Messaging with a Portal

`query` only gets data into a pattern once, at the moment its iframe is created — changing `query` on a later render does not reach an already-open portal. To send and receive messages after the portal has opened, use `PortalComponent`'s `ref` and `onMessage`:

```typescript
const portalRef = useRef<PortalComponentHandle>(null);

context.panes.openPane({
  placement: "floating",
  title: "My Portal",
  component: () => (
    <PortalComponent
      ref={portalRef}
      portal="map"
      portalType="map"
      pattern={myPattern}
      inst={inst}
      onMessage={(message) => {
        // handle a message sent from inside the pattern via os.sendEmbedMessage
      }}
    />
  ),
});

// later, send a message into the pattern:
portalRef.current?.sendMessage({ type: "highlightFeature", featureId });
```

On the pattern side (the code that runs inside the portal's iframe), use CasualOS's built-in embed-message APIs:

```typescript
// send a message out to the host page
await os.sendEmbedMessage({ type: "featureClicked", featureId });

// onEmbedMessage.tsx
// receive messages sent from the host page
let data = that;
if (data.message?.type === "highlightFeature") {
  highlightFeature(data.message.featureId);
}
```

The iframe loads asynchronously, so a pattern should send a `{ type: "ready" }`-style message once its `onInstJoined`/`onEggHatch` handler has run, and the host should wait to see that before calling `sendMessage` for the first time — otherwise the very first message can be sent before the pattern is listening and will be silently dropped.
