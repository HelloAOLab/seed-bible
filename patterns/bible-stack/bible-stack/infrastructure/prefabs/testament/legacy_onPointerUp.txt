import { thisTypedBot } from "bibleStack.prefabs.testament.botAdapter";
import { testamentInteractionController } from "bibleStack.infrastructure.di.bootstrap";

testamentInteractionController?.handleTestamentPointerUp({
  testament: thisTypedBot,
});
