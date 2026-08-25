import type { BotTypeMap } from "../../models/stack";
import type { PieceBot } from "../../models/casualos";

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

  handleStateChanged<B extends PieceBot>(bot: B, tags: Array<keyof B["tags"]>) {
    const strategy = this.#stateChangeStrategies[bot.tags.type as keyof T] as
      | ((bot: B, tags: Array<keyof B["tags"]>) => void)
      | undefined;
    strategy?.(bot, tags);
  }
}
