import type { DomainEventPort } from "../../../application/ports/in/eventBus";
import type { NavMenuStatePort } from "../../../application/ports/in/NavMenuState";
import type { ThemeStateAdapter } from "../theme/ThemeStateAdapter";
import type { InfrastructureEventPort } from "../../models/events";
import type { PieceCatalogPort } from "../../../application/ports/out/PieceCatalog";
import type { VerseReferenceConfigProviderPort } from "../../../application/ports/out/VerseReferenceConfigProvider";
import type { BookNameConfigProviderPort } from "../../../application/ports/out/BookNameConfigProvider";
import type { NavMenuController } from "../../controllers/navMenu/NavMenuController";
import type { EnvironmentAdapter } from "../casualos/EnvironmentAdapter";
import { NavMenu } from "../../presentation/app/NavMenu";

interface AdapterParams {
  eventBus: DomainEventPort;
  navMenuStateService: NavMenuStatePort;
  themeStateAdapter: ThemeStateAdapter;
  themeEventBus: InfrastructureEventPort;
  catalog: PieceCatalogPort;
  verseReferences: VerseReferenceConfigProviderPort;
  bookNames: BookNameConfigProviderPort;
  controller: NavMenuController;
  environment: EnvironmentAdapter;
}

export class NavMenuRendererAdapter {
  #eventBus: AdapterParams["eventBus"];
  #navMenuStateService: AdapterParams["navMenuStateService"];
  #themeStateAdapter: AdapterParams["themeStateAdapter"];
  #themeEventBus: AdapterParams["themeEventBus"];
  #catalog: AdapterParams["catalog"];
  #verseReferences: AdapterParams["verseReferences"];
  #bookNames: AdapterParams["bookNames"];
  #controller: AdapterParams["controller"];
  #environment: AdapterParams["environment"];
  #appId = "nav-menu";

  constructor({
    eventBus,
    navMenuStateService,
    themeStateAdapter,
    themeEventBus,
    catalog,
    verseReferences,
    bookNames,
    controller,
    environment,
  }: AdapterParams) {
    this.#eventBus = eventBus;
    this.#navMenuStateService = navMenuStateService;
    this.#themeStateAdapter = themeStateAdapter;
    this.#themeEventBus = themeEventBus;
    this.#catalog = catalog;
    this.#verseReferences = verseReferences;
    this.#bookNames = bookNames;
    this.#controller = controller;
    this.#environment = environment;
  }

  async render() {
    await os.registerApp(this.#appId, thisBot);
    os.compileApp(
      this.#appId,
      <NavMenu
        eventBus={this.#eventBus}
        getState={() => this.#navMenuStateService.getState()}
        getThemeCss={() => this.#themeStateAdapter.getCss()}
        themeEventBus={this.#themeEventBus}
        catalog={this.#catalog}
        verseReferences={this.#verseReferences}
        bookNames={this.#bookNames}
        controller={this.#controller}
        environment={this.#environment}
      />
    );
  }
}
