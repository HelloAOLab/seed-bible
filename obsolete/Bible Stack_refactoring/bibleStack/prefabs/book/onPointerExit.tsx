import { thisTypedBot } from "bibleStack.prefabs.book.botAdapter";
import { bookInteractionController } from "bibleStack.infrastructure.di.bootstrap";

bookInteractionController?.handleBookPointerExit(thisTypedBot);

// InstanceManager.TryClearVideoTimeout();
// if (globalThis.CLEARABLE_LERPING) {
//   thisBot.TryToUnlerp();
// }
