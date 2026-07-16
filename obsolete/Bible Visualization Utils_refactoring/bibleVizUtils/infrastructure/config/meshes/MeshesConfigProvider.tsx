import {
  MeshesUrls,
  type MeshesUrlsType,
} from "bibleVizUtils.infrastructure.config.meshes.urls";

export class MeshesConfigProvider {
  getMeshUrl<K extends keyof MeshesUrlsType>(key: K): MeshesUrlsType[K] {
    return MeshesUrls[key];
  }
}
