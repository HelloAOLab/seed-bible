import { thisTypedBot } from "bibleStack.prefabs.testament.botAdapter";
import { testamentInteractionController } from "bibleStack.infrastructure.di.bootstrap";

testamentInteractionController?.handleTestamentDrag(thisTypedBot);
os.enableCustomDragging();
