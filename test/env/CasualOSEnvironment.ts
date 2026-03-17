import { TestEnvironment } from "jest-environment-jsdom";
import type {
  EnvironmentContext,
  JestEnvironmentConfig,
} from "@jest/environment";
import * as appHooks from "preact/hooks";
import { render } from "preact";

export default class CasualOSEnvironment extends TestEnvironment {
  constructor(config: JestEnvironmentConfig, context: EnvironmentContext) {
    super(config, context);
  }

  override async setup() {
    await super.setup();
    (globalThis as any).os = {
      appHooks: {
        ...appHooks,
        render,
      },
    };
  }

  override async teardown() {
    delete (globalThis as any).os;
    await super.teardown();
  }
}
