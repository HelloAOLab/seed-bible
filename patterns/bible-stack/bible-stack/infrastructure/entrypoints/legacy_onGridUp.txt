import { canvasInteractionController } from "bibleStack.infrastructure.di.bootstrap";
import type { CanvasInteractionController } from "../controllers/casualos/CanvasInteractionController";

(canvasInteractionController as CanvasInteractionController).handleOnGridUp();
