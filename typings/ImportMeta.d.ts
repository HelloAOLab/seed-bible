interface ImportMeta {
  glob: (
    pattern: string,
    options?: { eager?: boolean }
  ) => Record<string, (() => Promise<unknown> | unknown) | unknown>;

  env: Record<string, string | boolean | undefined>;
}
