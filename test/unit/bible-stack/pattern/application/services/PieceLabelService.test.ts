import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { PieceLabelService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/PieceLabelService";
import type {
  ActivityIndicatorsAdapterPort,
  IdGeneratorPort,
  IndicatorsUpdaterPort,
  LabelAdapterPort,
  LabelDataStorePort,
  LabelFeedbackAdapterPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/PieceLabel";
import type { StackLabelableBiblePiece } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/pieceLifecycle";

type T = StackLabelableBiblePiece;

describe("pattern.bible-stack.application.services.PieceLabelService", () => {
  let service: PieceLabelService<T>;
  let labelAdapterPort: Mocked<LabelAdapterPort>;
  let labelDataStorePort: Mocked<LabelDataStorePort>;
  let indicatorsUpdaterPort: Mocked<IndicatorsUpdaterPort>;
  let idGeneratorPort: Mocked<IdGeneratorPort>;
  let activityIndicatorsAdapterPort: Mocked<ActivityIndicatorsAdapterPort>;
  let labelAnimationAdapterPort: Mocked<LabelFeedbackAdapterPort>;

  beforeEach(() => {
    labelAdapterPort = {
      spawnLabel: vi.fn(),
      despawnLabel: vi.fn(),
      locateLabel: vi.fn(),
    };

    labelDataStorePort = {
      getDataByTransformerId: vi.fn(),
      getDataByTailId: vi.fn(),
      getDataByTextId: vi.fn(),
      addLabelData: vi.fn(),
      removeLabelData: vi.fn(),
      getAllLabelsData: vi.fn(),
      getDataByOwnerId: vi.fn(),
    };

    indicatorsUpdaterPort = {
      updateIndicators: vi.fn(),
    };

    idGeneratorPort = {
      getId: vi.fn(),
    };

    activityIndicatorsAdapterPort = {
      showIndicators: vi.fn(),
      hideIndicators: vi.fn(),
      hideIndicator: vi.fn(),
      updateIndicatorsPosition: vi.fn(),
    };

    labelAnimationAdapterPort = {
      displayAttentionFeedback: vi.fn(),
      stopAttentionFeedback: vi.fn(),
      displayShowFeedback: vi.fn(),
      displayHideFeedback: vi.fn(),
      displayChangedIntensityFeedback: vi.fn(),
    };

    service = new PieceLabelService<T>({
      labelAdapterPort,
      labelDataStorePort,
      indicatorsUpdaterPort,
      labelPropertiesStrategies: {} as unknown as NonNullable<
        ConstructorParameters<typeof PieceLabelService>[0]
      >["labelPropertiesStrategies"],
      dateFormatGetterPort: {
        dateFormat: "Absolute",
      },
      idGeneratorPort,
      activityIndicatorsAdapterPort,
      labelAnimationAdapterPort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(PieceLabelService);
  });
});
