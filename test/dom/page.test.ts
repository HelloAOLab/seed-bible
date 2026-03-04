/**
 * @jest-environment jsdom
 */

import type { Simulation } from "@casual-simulation/aux-vm";
import { addAux, newSimulation } from "./helpers";
import { runScript, type StoredAux } from "@casual-simulation/aux-common";
import { readPackage } from "../../script/lib/package";

// console.log = jest.fn();

let sim: Simulation;
let seedBible: StoredAux;

beforeAll(async () => {
  seedBible = await readPackage("seed-bible");
});

beforeEach(async () => {
  // We need a random script tag in the document
  // for posthog to initialize properly
  document.body.appendChild(document.createElement("script"));

  sim = await newSimulation();
  await addAux(sim, seedBible);

  await sim.helper.transaction(
    runScript('destroy(getBots("system", "app.error"))')
  );
});

afterEach(async () => {
  sim?.unsubscribe();
  sim = null!;
});

test("can render", async () => {
  await sim.helper.shout("onInstJoined", null, {
    inst: "test",
  });

  // await sim.helper.createBot('testBot', {
  //     test: '@document.body.innerHTML = "Hello World!"',
  // });

  // await sim.helper.shout('test', ['testBot']);

  expect(document.body.innerHTML).toBe("Hello World!");
});
