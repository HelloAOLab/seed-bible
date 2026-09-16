import { describe, expect, it, vi, type Mocked, beforeEach } from "vitest";
import { EnvironmentSetUpService } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/services/EnvironmentSetUpService";
import type { EnvironmentAdapterPort } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/ports/out/environmentSetUp";
import { EXPERIENCE_KEYS } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/domain/models/experience";

describe("application.services.EnvironmentSetUpService", () => {
  let environmentAdapterPort: Mocked<EnvironmentAdapterPort>;
  let service: EnvironmentSetUpService;
  beforeEach(() => {
    environmentAdapterPort = {
      setUp: vi.fn(),
    };
    service = new EnvironmentSetUpService({
      environmentAdapterPort,
    });
  });

  it("orchestrates the architecture's set up", () => {
    service.setUp(EXPERIENCE_KEYS.TABERNACLE);

    expect(environmentAdapterPort.setUp).toHaveBeenCalledOnce();
  });

  it("passes the correct key to the adapter", () => {
    const key = EXPERIENCE_KEYS.TABERNACLE;

    service.setUp(key);

    expect(environmentAdapterPort.setUp).toHaveBeenCalledWith(key);
  });
});
