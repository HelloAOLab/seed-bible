import type {
  Bot,
  AnimateTagFunctionOptions,
} from "../../../../typings/AuxLibraryDefinitions";

export interface BaseTagData<T> {
  bot: Bot;
  options: AnimateTagFunctionOptions;
  then?: T;
}

export interface AnimateTagData extends BaseTagData<AnimateTagData> {
  tag?: string;
}

export interface SetTagData extends BaseTagData<SetTagData> {
  tag: string;
}
