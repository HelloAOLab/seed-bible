import { TestEnvironment } from "jest-environment-jsdom";
// import type {
//   EnvironmentContext,
//   JestEnvironmentConfig,
// } from "@jest/environment";
import { v4 as uuid } from "uuid";
import { DateTime } from "luxon";

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
    // CasualOS exposes luxon's DateTime as a global at runtime.
    this.global.DateTime = DateTime;
    this.global.os = {
      syncConfigBotTagsToURL: () => {},
      addBotListener: () => {},
      requestWakeLock: async () => {},
      disableWakeLock: async () => {},
      // Hooks are assigned in test/env/setupCasualOSAppHooks.js from the test runtime context.
      appHooks: {},
    };
    this.global.posthog = null;
    this.global.thisBot = {
      id: "test-bot-id",
      tags: {},
      masks: {},
    };
    this.global.configBot = {
      id: "test-config-bot-id",
      tags: {},
      masks: {},
    };
  }

  async teardown() {
    delete this.global.os;
    delete this.global.uuid;
    delete this.global.DateTime;
    delete this.global.posthog;
    await super.teardown();
  }
}
