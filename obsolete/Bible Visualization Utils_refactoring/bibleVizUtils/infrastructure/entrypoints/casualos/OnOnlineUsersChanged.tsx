import { userPresenceController } from "bibleVizUtils.infrastructure.di.bootstrap";
import { userColorController } from "bibleVizUtils.infrastructure.di.bootstrap";

userColorController?.handleOnlineUsersChanged();
userPresenceController?.handleOnlineUsersChanged();
