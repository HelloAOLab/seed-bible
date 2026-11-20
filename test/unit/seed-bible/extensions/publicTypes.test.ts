import { describe, expectTypeOf, it } from "vitest";
import type { ReadonlySignal } from "@preact/signals";
import type {
  SandboxContext,
  SandboxError,
  SandboxErrorCode,
  SandboxI18nHook,
  SandboxPaneOptions,
  SandboxPanePlacement,
  SandboxPermission,
  SandboxPermissionInfo,
  SandboxToolOptions,
  SandboxTranslationChapterRef,
  SANDBOX_PERMISSION_INFO,
  useI18n,
} from "@packages/seed-bible/seed-bible/extensions";
import type {
  SandboxMethod,
  SandboxMethods,
  SandboxState,
  SandboxToolDefinition,
  SandboxToolSurface,
  TestAnswer,
  TestHost,
  TestHostOptions,
} from "@packages/seed-bible/seed-bible/extensions/testing";
import type {
  CloseButton,
  CloseButtonProps,
  SvgIconProps,
  Translation,
  TranslationLanguageGroup,
  TranslationListProps,
  TranslationViewMode,
  useDragReorder,
  UseDragReorderOptions,
} from "@packages/seed-bible/seed-bible/components";

// Extension authors can only name a type their entry point exports. These
// fail `pnpm check:ts` if a type used in a public signature stops being one.
describe("types in the public extension API", () => {
  it("are exported from seed-bible/extensions", () => {
    expectTypeOf<SandboxError["code"]>().toEqualTypeOf<SandboxErrorCode>();
    expectTypeOf<
      SandboxPaneOptions["placement"]
    >().toEqualTypeOf<SandboxPanePlacement>();
    expectTypeOf<typeof SANDBOX_PERMISSION_INFO>().toEqualTypeOf<
      Record<SandboxPermission, SandboxPermissionInfo>
    >();
    expectTypeOf<SandboxToolOptions["isVisible"]>().toEqualTypeOf<
      boolean | ReadonlySignal<boolean> | undefined
    >();
    expectTypeOf<
      Parameters<SandboxContext["audio"]["narrators"]>[0]
    >().toEqualTypeOf<SandboxTranslationChapterRef>();
    expectTypeOf<typeof useI18n>().returns.toEqualTypeOf<SandboxI18nHook>();
  });

  it("are exported from seed-bible/extensions/testing", () => {
    expectTypeOf<TestHostOptions["state"]>().toEqualTypeOf<
      Partial<SandboxState> | undefined
    >();
    expectTypeOf<TestHost["tools"]>().toEqualTypeOf<
      Map<string, SandboxToolDefinition>
    >();
    expectTypeOf<
      SandboxToolDefinition["surface"]
    >().toEqualTypeOf<SandboxToolSurface>();
    expectTypeOf<TestAnswer<"notes.create">>()
      .parameter(0)
      .toEqualTypeOf<SandboxMethods["notes.create"]["params"]>();
    expectTypeOf<"notes.create">().toExtend<SandboxMethod>();
  });

  it("are exported from seed-bible/components", () => {
    expectTypeOf<
      Parameters<typeof CloseButton>[0]
    >().toEqualTypeOf<CloseButtonProps>();
    expectTypeOf<
      Parameters<typeof useDragReorder>[0]
    >().toEqualTypeOf<UseDragReorderOptions>();
    expectTypeOf<TranslationListProps["groups"]>().toEqualTypeOf<
      TranslationLanguageGroup[]
    >();
    expectTypeOf<
      TranslationListProps["viewMode"]
    >().toEqualTypeOf<TranslationViewMode>();
    expectTypeOf<TranslationLanguageGroup["translations"]>().toEqualTypeOf<
      Translation[]
    >();
    expectTypeOf<SvgIconProps>().toHaveProperty("className");
  });
});
