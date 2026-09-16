import type { DomainEventMap } from "../../../domain/models/events";
import type { BaseEventManager } from "../../services/BaseEventManager";

export type DomainEventPort = BaseEventManager<DomainEventMap>;
