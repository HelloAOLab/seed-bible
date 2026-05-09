import {
  StackPieceMeasurements,
  type StackPieceMeasurementsType,
} from "bibleVizUtils.infrastructure.config.stacks.measurements";
import {
  StackSpacings,
  type StackSpacingsType,
} from "bibleVizUtils.infrastructure.config.stacks.spacings";
import { StackAnimationsDuration } from "bibleVizUtils.infrastructure.config.stacks.animations";

export class StackConfigProvider {
  getStackPieceMeasurements(): StackPieceMeasurementsType {
    return StackPieceMeasurements;
  }

  getStackPieceMeasurement: <K extends keyof StackPieceMeasurementsType>(
    measurement: K
  ) => StackPieceMeasurementsType[K] = (measurement) => {
    return this.getStackPieceMeasurements()[measurement];
  };

  getStackSpacings(): StackSpacingsType {
    return StackSpacings;
  }

  getStackSpacing: <K extends keyof StackSpacingsType>(
    spacing: K
  ) => StackSpacingsType[K] = (spacing) => {
    return this.getStackSpacings()[spacing];
  };

  getStackAnimationsDuration(): typeof StackAnimationsDuration {
    return StackAnimationsDuration;
  }

  getStackAnimationDuration: <K extends keyof typeof StackAnimationsDuration>(
    key: K
  ) => (typeof StackAnimationsDuration)[K] = (key) => {
    return this.getStackAnimationsDuration()[key];
  };
}
