const keys = [...(that?.keys || [])];

const shortcutFnKey = {
  control: "control",
  meta: "meta",
};

const getInput = async () => {
  return os.showInput("", {
    title: "Publish",
    confirmText: "Yes",
  });
};

async function handlePublish(configBot, os, shout) {
  const input = await getInput();
  if (!input) return;

  configBot.tags.manualPublish = true;

  const link = await shout("aoPublishAB", {
    ab: input,
    manualPublish: true,
  })[0];
  return { link }; // safe to return, plain object
}

keys?.forEach((key) => {
  if (!globalThis.SHORTCUT_KEYS) {
    globalThis.SHORTCUT_KEYS = {};
  }
  const innerKey = key.toLocaleLowerCase();
  console.log(
    innerKey,
    globalThis.SHORTCUT_KEYS,
    "key",
    globalThis.SHORTCUT_KEYS["meta"]
  );

  if (
    globalThis.SHORTCUT_KEYS[shortcutFnKey.control] ||
    globalThis.SHORTCUT_KEYS[shortcutFnKey.meta]
  ) {
    if (innerKey === ";") {
      os.downloadBots(
        getBots(byMod({ space: "shared", aoIgnore: null })),
        os.getCurrentInst()
      );
    }
    if (innerKey === "0") {
      handlePublish(configBot, os, shout);
    }
    if (innerKey === "e") {
      os.showUploadAuxFile();
    }
  }
  globalThis.SHORTCUT_KEYS[innerKey] = true;
});
