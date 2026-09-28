import { thisTypedBot } from "bibleStack.prefabs.section.botAdapter";
import { sectionInteractionController } from "bibleStack.infrastructure.di.bootstrap";

sectionInteractionController?.handleSectionDrag(thisTypedBot);
os.enableCustomDragging();
