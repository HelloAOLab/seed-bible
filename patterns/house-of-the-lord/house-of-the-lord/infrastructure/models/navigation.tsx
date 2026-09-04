import type { DomainEventPort } from "../../application/ports/in/eventBus";
import type { BookNameConfigProviderPort } from "../../application/ports/out/BookNameConfigProvider";
import type { PieceCatalogPort } from "../../application/ports/out/PieceCatalog";
import type { VerseReferenceConfigProviderPort } from "../../application/ports/out/VerseReferenceConfigProvider";
import type { NavigationState } from "../../domain/models/navigation";
import type { NavMenuController } from "../controllers/navMenu/NavMenuController";
import type { InfrastructureEventPort } from "./events";
import type { EnvironmentAdapter } from "../adapters/casualos/EnvironmentAdapter";

export interface NavMenuProps {
  getState: () => NavigationState;
  getThemeCss: () => string;
  eventBus: DomainEventPort;
  themeEventBus: InfrastructureEventPort;
  catalog: PieceCatalogPort;
  verseReferences: VerseReferenceConfigProviderPort;
  bookNames: BookNameConfigProviderPort;
  controller: NavMenuController;
  environment: EnvironmentAdapter;
}

export interface NavMenuContextType {
  menuState: NavigationState;
  controller: NavMenuController;
  catalog: PieceCatalogPort;
  verseReferences: VerseReferenceConfigProviderPort;
  bookNames: BookNameConfigProviderPort;
}
