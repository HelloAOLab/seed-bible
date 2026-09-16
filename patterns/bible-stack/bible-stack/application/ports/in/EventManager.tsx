import type { BibleStackEvents } from "../../../domain/models/events";
import type { BaseEventManager } from "../../services/BaseEventManager";

export type DomainEventManager = BaseEventManager<BibleStackEvents>;
