import {
  ScriptureMap3DMeasurements,
  type ScriptureMap3DMeasurementsType,
} from "bibleVizUtils.infrastructure.config.scriptureMap3D.measurements";

export class ScriptureMap3DConfigProvider {
  getBibleLayoutMeasurements(): ScriptureMap3DMeasurementsType {
    return ScriptureMap3DMeasurements;
  }

  getBibleLayoutMeasurement: <K extends keyof ScriptureMap3DMeasurementsType>(
    measurement: K
  ) => ScriptureMap3DMeasurementsType[K] = (measurement) => {
    const measurements = this.getBibleLayoutMeasurements();
    return measurements[measurement];
  };
}
