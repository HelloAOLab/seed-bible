import type { BotTypeMap } from "../../models/stack";

type StrategiesMap = {
  [K in keyof BotTypeMap]?: (
    bot: BotTypeMap[K],
    tags: Array<keyof BotTypeMap[K]["tags"]>
  ) => void;
};

interface ControllerParams<T extends StrategiesMap> {
  stateChangeStrategies: T;
}

export class BotStateController<T extends StrategiesMap> {
  #stateChangeStrategies: ControllerParams<T>["stateChangeStrategies"];

  constructor({ stateChangeStrategies: strategies }: ControllerParams<T>) {
    this.#stateChangeStrategies = strategies;
  }

  handleStateChanged<K extends keyof BotTypeMap>(
    bot: BotTypeMap[K],
    tags: Array<keyof BotTypeMap[K]["tags"]>
  ) {
    const strategy = this.#stateChangeStrategies[
      bot.tags.type as K
    ] as StrategiesMap[K];
    strategy?.(bot, tags);
  }
}
