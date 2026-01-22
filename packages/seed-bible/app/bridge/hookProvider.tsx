import type { Environment } from "app.contract.environment";
import type { HookProvider } from "app.contract.provider";
import { ProviderFactory } from "app.contract.factory";

/**
 * Factory which provides a proper "HookProvider" implementation for the given environment.
 */
// export class HookProviderFactory extends ProviderFactory<Environment, HookProvider> {
//     constructor() { super() }
//     protected async _getProvider(e: Environment): Promise<HookProvider> {
//         switch (e) {
//             case 'casualos':
//                 return (await import("app.bridge.adapters.casualOSHookProvider")).casualOSHookProvider;
//                 break;
//         }
//     }
// }

// There is an error in CasualOS with type arguments on abstract class extensions.
export class HookProviderFactory extends ProviderFactory {
  constructor() {
    super();
  }
  protected async _getProvider(e: Environment): Promise<HookProvider> {
    switch (e) {
      case "casualos":
        return (await import("app.bridge.adapters.casualOSHookProvider"))
          .casualOSHookProvider;
        break;
    }
  }
}

export const hookProviderFactory: HookProviderFactory =
  new HookProviderFactory();
