import {
  scriptureMapEventManager,
  Events,
} from "scriptureMap2D.main.eventManager";
scriptureMapEventManager.emit(Events.SubscriptionsChanged);
