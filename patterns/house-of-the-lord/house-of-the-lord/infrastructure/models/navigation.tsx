import type { DomainEventPort } from "../../application/ports/in/eventBus";
import type { BookNameConfigProviderPort } from "../../application/ports/out/BookNameConfigProvider";
import type { PieceCatalogPort } from "../../application/ports/out/PieceCatalog";
import type { VerseReferenceConfigProviderPort } from "../../application/ports/out/VerseReferenceConfigProvider";
import type { NavigationState } from "../../domain/models/navigation";
import type { NavMenuController } from "../controllers/navMenu/NavMenuController";

export interface NavMenuProps {
  getState: () => NavigationState;
  getThemeCss: () => string;
  eventBus: DomainEventPort;
  catalog: PieceCatalogPort;
  verseReferences: VerseReferenceConfigProviderPort;
  bookNames: BookNameConfigProviderPort;
  controller: NavMenuController;
}
