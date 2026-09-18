import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { ScriptureService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/ScriptureService";
import type { ArrangementInfo } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/arrangement";

describe("pattern.bible-stack.application.services.ScriptureService", () => {
  let service: ScriptureService;
  let dataRepositoryPort: Mocked<
    NonNullable<ConstructorParameters<typeof ScriptureService>[0]>
  >;

  beforeEach(() => {
    dataRepositoryPort = {
      getBookStaticInfo: vi.fn(),
    };

    service = new ScriptureService(
      dataRepositoryPort,
      {} as unknown as ArrangementInfo
    );
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(ScriptureService);
  });
});
