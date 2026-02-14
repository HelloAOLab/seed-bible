import { isValidScriptSource } from "app.util.validations";

/**
 * This is specific to CasualOS (system coupling).
 * * A proper CasualOS entrypoint implementing the seed-bible source should be architected.
 */
function configBotFluff() {
  if (!configBot) return;
  if (configBot.tags.systemPortal) return;
  configBot.tags.gridPortal = null;
  configBot.tags.noGridPoral = true;
  setTimeout(() => {
    configBot.tags.gridPortal = null;
  }, 1000);
}

/**
 * This is specific to CasualOS (system coupling).
 * * A proper CasualOS entrypoint implementing the seed-bible source should be architected.
 */
function osFluff() {
  if (!os) return;
  os.hideLoadingScreen();
}

/**
 * This is likely a hack...
 * * We need to be writing proper JSX/HTML that does not need this level of programatic intervention.
 * * Or if there is/was a bug in CasualOS, that needs to be made known via an issue.
 * @returns
 */
function documentFluff() {
  if (!document?.body) return;
  document.body.style.overscrollBehaviorX = "none";
}

/**
 * Ideally this needs to be converted to a store contract whose implementation is provided via dependency injection.
 * * There are very few parties using this feature.
 */
function localStorageFluff() {
  if (typeof getBot !== "function" || typeof create !== "function") return;
  const localStorage = getBot("system", "app.localStorage");
  if (!localStorage)
    return create({
      system: "app.localStorage",
      space: "local",
    });
}

/**
 * This may be fluff... ideally we should be just include these in the root external resource dependencies if possible.
 */
async function preloadScripts() {
  const scripts = [
    "https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.17/index.global.min.js",
    "https://cdn.jsdelivr.net/npm/@fullcalendar/daygrid@6.1.17/index.global.min.js",
    "https://cdn.jsdelivr.net/npm/@fullcalendar/timegrid@6.1.17/index.global.min.js",
    "https://cdn.jsdelivr.net/npm/@fullcalendar/interaction@6.1.17/index.global.min.js",
    "https://cdn.jsdelivr.net/npm/@fullcalendar/resource-timegrid@6.1.17/index.global.min.js",
    "https://cdn.jsdelivr.net/npm/@fullcalendar/icalendar@6.1.17/index.global.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/ical.js/1.4.0/ical.min.js",
    "https://cdn.jsdelivr.net/npm/fullcalendar-scheduler@6.1.18/index.global.min.js",
    "https://cdn.jsdelivr.net/npm/flatpickr",
  ];

  async function loadScripts(scripts: Array<string>) {
    for (const scriptSrc of scripts) {
      if (!isValidScriptSource(scriptSrc)) continue;
      const scriptEl = document.createElement("script");
      scriptEl.src = scriptSrc;
      const scriptLoaded = new Promise((res, rej) => {
        scriptEl.onload = () => res(scriptSrc);
        scriptEl.onerror = (err) => {
          console.error(`Failed to load script: ${scriptSrc}`, err);
          rej(err);
        };
      });
      document.body.appendChild(scriptEl);
      await scriptLoaded;
    }
  }

  await loadScripts(scripts);
}

/**
 * This needs to be reworked.
 * * It originally came from init.tsx and tightly coupled the system to casualos.
 */
export async function allTheInitFluff() {
  configBotFluff();
  osFluff();
  documentFluff();
  localStorageFluff();

  await preloadScripts();

  thisBot.canvasController();

  await os.sleep(500);

  return await shout("runAutoPackages");
}
