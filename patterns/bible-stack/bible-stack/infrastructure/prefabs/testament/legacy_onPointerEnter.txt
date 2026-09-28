import { thisTypedBot } from "bibleStack.prefabs.testament.botAdapter";
import { testamentInteractionController } from "bibleStack.infrastructure.di.bootstrap";

thisTypedBot.masks.isBeingHovered = true;
testamentInteractionController?.handleTestamentPointerEnter(thisTypedBot);
