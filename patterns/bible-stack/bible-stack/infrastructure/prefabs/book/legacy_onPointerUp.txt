import { thisTypedBot } from "bibleStack.prefabs.book.botAdapter";
import { bookInteractionController } from "bibleStack.infrastructure.di.bootstrap";

bookInteractionController?.handleBookPointerUp(thisTypedBot);
