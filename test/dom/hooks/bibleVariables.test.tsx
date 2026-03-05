/**
 * @jest-environment jsdom
 */

import type { Simulation } from "@casual-simulation/aux-vm";
import { addAux, newSimulation } from "../helpers";
import { runScript, type StoredAux } from "@casual-simulation/aux-common";
import { readPackage } from "../../../script/lib/package";
import { render } from "preact-render-to-string";
import { h } from "preact";

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

test("can get hooks", async () => {
  console.log("start");
  await sim.helper.createBot("testBot", {
    test: `@
            console.log('importing');
            import { useBibleContext, BibleVariablesProvider } from "app.hooks.bibleVariables";
            const { render } = os.appHooks;

            const GetContext = () => {
                const context = useBibleContext();
                return <div>{JSON.stringify(context)}</div>;
            };

            const TestComponent = () => {
                return <BibleVariablesProvider>
                    <GetContext />
                </BibleVariablesProvider>
            };

            console.log('Setting component');
            window.TestComponent = TestComponent;
            return TestComponent;
        `,
  });

  await waitAsync();
  const result = await sim.helper.shout("test", ["testBot"]);

  await waitAsync();
  const TestComponent = globalThis.TestComponent as any;
  expect(TestComponent).toBeDefined();

  const rendered = render(h(TestComponent));

  expect(rendered).toMatchSnapshot();
});

async function waitAsync() {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}
