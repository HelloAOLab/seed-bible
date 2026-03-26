import { DebouncerService } from "bibleVizUtils.services.DebouncerService";
import { UpdateUserColorStore } from "bibleVizUtils.functions.users";

const updateUserColorStoreDebouncer = new DebouncerService(
  UpdateUserColorStore,
  500
);

export { updateUserColorStoreDebouncer };
