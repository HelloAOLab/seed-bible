import { I18nProvider } from "@packages/seed-bible/seed-bible/i18n";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { ComponentChildren } from "preact";

export function TestHost(props: {
  state: SeedBibleState;
  children: ComponentChildren;
}) {
  return (
    <>
      <I18nProvider i18n={props.state.i18n}>{props.children}</I18nProvider>
    </>
  );
}
