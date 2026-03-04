import {
  TEMPORARY_BOT_PARTITION_ID,
  createBot,
  COOKIE_BOT_PARTITION_ID,
  TEMPORARY_SHARED_PARTITION_ID,
  BOOTSTRAP_PARTITION_ID,
  getBotsStateFromStoredAux,
  type LocalActions,
  type RemoteActions,
  type StoredAux,
  type ApplyUpdatesToInstAction,
} from "@casual-simulation/aux-common";
import type {
  SimulationOrigin,
  AuxConfig,
  Simulation,
} from "@casual-simulation/aux-vm";
import { nodeSimulationWithConfig } from "@casual-simulation/aux-vm-node";
import { v4 as uuid } from "uuid";

export async function newSimulation() {
  const configBotId = uuid();
  const origin: SimulationOrigin = {
    recordName: null,
    inst: "test",
    kind: "static",
  };
  const simConfig: AuxConfig["config"] = {
    version: "v4.1.5",
    versionHash: "hash",

    device: {
      supportsAR: false,
      supportsVR: false,
      supportsDOM: true,
      comID: null,
      isCollaborative: false,
      ab1BootstrapUrl: null!,
      allowCollaborationUpgrade: false,
    },
    enableDom: true,
    // bootstrapState: ,
  };

  const sim = nodeSimulationWithConfig(
    {
      connectionId: configBotId,
    },
    "test",
    origin,
    {
      configBotId,
      config: simConfig,

      partitions: {
        shared: {
          type: "yjs",
          remoteEvents: true,
          connectionId: configBotId,
        },
        [TEMPORARY_BOT_PARTITION_ID]: {
          type: "memory",
          initialState: {
            [configBotId]: createBot(configBotId, {
              inst: origin.inst as string,
            }),
          },
        },
        [COOKIE_BOT_PARTITION_ID]: {
          type: "memory",
          initialState: {},
          private: true,
        },
        [TEMPORARY_SHARED_PARTITION_ID]: {
          type: "memory",
          initialState: {},
        },
        [BOOTSTRAP_PARTITION_ID]: {
          type: "memory",
          initialState: simConfig.bootstrapState
            ? getBotsStateFromStoredAux(simConfig.bootstrapState)
            : {},
          private: true,
        },
      },
    }
  );

  await sim.init();

  return sim;
}

export async function addAux(sim: Simulation, data: StoredAux) {
  let event: LocalActions | RemoteActions;
  if (data.version === 1) {
    event = {
      type: "apply_state",
      state: data.state,
    };
  } else {
    const applyUpdatesToInst: ApplyUpdatesToInstAction = {
      type: "apply_updates_to_inst",
      updates: data.updates,
    };
    event = {
      type: "remote",
      event: applyUpdatesToInst,
    };
  }

  await sim.helper.transaction(event);
}
