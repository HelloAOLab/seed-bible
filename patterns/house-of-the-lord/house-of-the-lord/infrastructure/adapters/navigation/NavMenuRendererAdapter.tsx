import type { DomainEventPort } from "../../../application/ports/in/eventBus";
import type { NavMenuStatePort } from "../../../application/ports/in/NavMenuState";
import type { ThemeStatePort } from "../../../application/ports/in/ThemeState";
import type { PieceCatalogPort } from "../../../application/ports/out/PieceCatalog";
import type { VerseReferenceConfigProviderPort } from "../../../application/ports/out/VerseReferenceConfigProvider";
import type { BookNameConfigProviderPort } from "../../../application/ports/out/BookNameConfigProvider";
import type { NavMenuController } from "../../controllers/navMenu/NavMenuController";
import { NavMenu } from "../../presentation/app/NavMenu";

interface AdapterParams {
  eventBus: DomainEventPort;
  navMenuStateService: NavMenuStatePort;
  themeStatePort: ThemeStatePort;
  catalog: PieceCatalogPort;
  verseReferences: VerseReferenceConfigProviderPort;
  bookNames: BookNameConfigProviderPort;
  controller: NavMenuController;
}

export class NavMenuRendererAdapter {
  #eventBus: AdapterParams["eventBus"];
  #navMenuStateService: AdapterParams["navMenuStateService"];
  #themeStatePort: AdapterParams["themeStatePort"];
  #catalog: AdapterParams["catalog"];
  #verseReferences: AdapterParams["verseReferences"];
  #bookNames: AdapterParams["bookNames"];
  #controller: AdapterParams["controller"];
  #appId = "nav-menu";

  constructor({
    eventBus,
    navMenuStateService,
    themeStatePort,
    catalog,
    verseReferences,
    bookNames,
    controller,
  }: AdapterParams) {
    this.#eventBus = eventBus;
    this.#navMenuStateService = navMenuStateService;
    this.#themeStatePort = themeStatePort;
    this.#catalog = catalog;
    this.#verseReferences = verseReferences;
    this.#bookNames = bookNames;
    this.#controller = controller;
  }

  async render() {
    await os.registerApp(this.#appId, thisBot);
    os.compileApp(
      this.#appId,
      <NavMenu
        eventBus={this.#eventBus}
        getState={() => this.#navMenuStateService.getState()}
        getThemeCss={() => this.#themeStatePort.getCss()}
        catalog={this.#catalog}
        verseReferences={this.#verseReferences}
        bookNames={this.#bookNames}
        controller={this.#controller}
      />
    );
  }
}
