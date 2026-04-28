import { TestEnvironment } from "jest-environment-jsdom";
// import type {
//   EnvironmentContext,
//   JestEnvironmentConfig,
// } from "@jest/environment";
import * as appHooks from "preact/hooks";
import { render } from "preact";
import { v4 as uuid } from "uuid";

/**
 * @import { EnvironmentContext, JestEnvironmentConfig } from "@jest/environment"
 */

export default class CasualOSEnvironment extends TestEnvironment {
  /**
   * @param {JestEnvironmentConfig} config
   * @param {EnvironmentContext} context
   */
  constructor(config, context) {
    super(config, context);
  }

  async setup() {
    await super.setup();
    this.global.uuid = uuid;
    this.global.os = {
      syncConfigBotTagsToURL: () => {},
      requestWakeLock: async () => {},
      disableWakeLock: async () => {},
      appHooks: {
        ...appHooks,
        render,
      },
    };
    this.global.posthog = null;
  }

  async teardown() {
    delete this.global.os;
    delete this.global.uuid;
    delete this.global.posthog;
    await super.teardown();
  }
}
