import { arrangementController } from "bibleVizUtils.infrastructure.di.bootstrap";

const { orientation } = that;

arrangementController?.handleBookOientationChanged(orientation);
