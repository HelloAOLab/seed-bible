import type {
  PoolData,
  Pool,
  TypedBot,
  PieceBotTags,
} from "bibleVizUtils.infrastructure.models.casualos";

export type ObjectPoolerConfig<
  P extends Record<keyof P, TypedBot<PieceBotTags>>,
> = {
  [K in keyof P]: PoolData<K, P[K]>;
}[keyof P][];

export interface DimensionGetter {
  getDimension: () => string;
}

export class ObjectPooler<P extends Record<keyof P, TypedBot<PieceBotTags>>> {
  #poolDictionary: Map<keyof P, any>;
  #dimensionGetter: DimensionGetter;

  constructor(
    poolsData: ObjectPoolerConfig<P>,
    dimensionGetter: DimensionGetter
  ) {
    const dictionary = new Map(
      poolsData.map((poolData) => {
        return [poolData.key, this.#createPool(poolData)];
      })
    );
    this.#poolDictionary = dictionary;
    this.#dimensionGetter = dimensionGetter;
  }

  #createPool<K extends keyof P>(poolData: PoolData<K, P[K]>): Pool<K, P[K]> {
    const objectList = Array.from({ length: poolData.size }).map(() =>
      this.#createObject(poolData)
    );
    return {
      poolData: poolData,
      objectPool: objectList,
      inUseObjects: [],
    };
  }
  #createObject<K extends keyof P>(poolData: PoolData<K, P[K]>): P[K] {
    const object = create(poolData.prefab, {
      space: "tempLocal",
    }) as P[K];
    (object.tags as any).type = poolData.key;
    for (const { tag, value } of poolData.customTags) {
      (object.tags as any)[tag] = value;
    }
    return object;
  }
  getObject<K extends keyof P>(key: K): P[K] {
    const pool = this.#poolDictionary.get(key) as Pool<K, P[K]>;

    if (!pool) {
      throw new Error(
        `ObjectPooler: pool not registered for key ${String(key)}`
      );
    }

    let object;
    if (pool.objectPool.length > 0) {
      object = pool.objectPool.shift() as P[K];
    } else {
      object = this.#createObject(pool.poolData);
    }

    object.tags.isInUse = true;
    pool.inUseObjects.push(object);
    return object;
  }
  getObjects<K extends keyof P>(key: K, amount: number): P[K][] {
    return Array.from({ length: amount }).map(() => this.getObject(key));
  }
  releaseObject<K extends keyof P>(obj: P[K], key: K) {
    const dimension = this.#dimensionGetter.getDimension();

    const pool = this.#poolDictionary.get(key) as Pool<K, P[K]>;

    const inUseObject = pool.inUseObjects.find(
      (activeObject) => activeObject.id === obj.id
    );

    if (inUseObject) {
      clearTagMasks(inUseObject);
      clearAnimations(inUseObject);
      const cleanupTagsData = pool.poolData.cleanupCustomTags;
      if (cleanupTagsData) {
        for (const tagCleanupData of cleanupTagsData) {
          const { tag, value } = tagCleanupData;
          (inUseObject.tags as any)[tag] = value;
        }
      }
      (inUseObject.tags as any)[dimension] = false;
      inUseObject.tags.isInUse = false;
      const idx = pool.inUseObjects.indexOf(inUseObject);
      pool.inUseObjects.splice(idx, 1);
      pool.objectPool.push(inUseObject);
    }
  }
  releaseObjects<K extends keyof P>(objects: P[K][], key: K) {
    for (const obj of objects) {
      this.releaseObject(obj, key);
    }
  }
  #disposePool<K extends keyof P>(key: K) {
    const pool = this.#poolDictionary.get(key) as Pool<K, P[K]>;

    if (pool.inUseObjects.length > 0) {
      this.releaseObjects(pool.inUseObjects, key);
    }

    for (const object of pool.objectPool) {
      destroy(object);
    }

    this.#poolDictionary.delete(key);
  }
  disposeAllPools() {
    const keys = [...this.#poolDictionary.keys()];
    for (const key of keys) {
      this.#disposePool(key);
    }
  }
}
