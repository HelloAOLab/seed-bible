import type {
  Vector2 as Vector2Type,
  Vector3 as Vector3Type,
} from "../../../../../../typings/AuxLibraryDefinitions";
import type {
  BookLayout,
  ComputedGroupBookProperties,
} from "bibleVizUtils.infrastructure.models.canvas";
import type { Span } from "bibleVizUtils.domain.models.commonTypes";

export class BookStackLayoutAdapter {
  #computeAxisProperties(
    axisLayout: Span,
    sectionPositionAxis: number,
    baseScaleAxis: number,
    spacing: number
  ) {
    let scale = baseScaleAxis * (axisLayout.to - axisLayout.from);
    let position = sectionPositionAxis;
    let layoutPosition = 0;

    if (axisLayout.from === 0 && axisLayout.to !== 1) {
      scale -= spacing / 2;
      layoutPosition = scale / 2 - baseScaleAxis / 2;
      position += layoutPosition;
    } else if (axisLayout.from !== 0 && axisLayout.to === 1) {
      scale -= spacing / 2;
      layoutPosition = baseScaleAxis / 2 - scale / 2;
      position += layoutPosition;
    }
    return { scale, position, layoutPosition };
  }

  /**
   * Places a book in the section's exploded view from its normalized
   * `explodedViewPosition`. Shared by the stack update (`BookStackUpdaterAdapter`)
   * and the section selection cascade (`SectionSelectionAdapter`) — same inputs,
   * same output. The section scale source differs per caller, so it is passed in.
   */
  computeExplodedBookPosition(
    explodedViewPosition: { x: number; y: number },
    sectionScale: { x: number; y: number },
    sectionPosition: { x: number; y: number }
  ): { x: number; y: number } {
    return {
      x: explodedViewPosition.x * sectionScale.x + sectionPosition.x,
      y: explodedViewPosition.y * sectionScale.y + sectionPosition.y,
    };
  }

  /**
   * The Z depth (`desiredScaleZ`) a level of books occupies inside a section,
   * proportional to how many of the section's chapters live in that level.
   */
  computeBookDesiredScaleZ({
    sectionDesiredScaleZ,
    betweenBooks,
    levelsCount,
    chaptersInLevel,
    sectionTotalChapters,
  }: {
    sectionDesiredScaleZ: number;
    betweenBooks: number;
    levelsCount: number;
    chaptersInLevel: number;
    sectionTotalChapters: number;
  }): number {
    const sectionAvailableSpace =
      sectionDesiredScaleZ - betweenBooks * (levelsCount + 1);
    const percentageOfLevelInSection = chaptersInLevel / sectionTotalChapters;
    return percentageOfLevelInSection * sectionAvailableSpace;
  }

  computeGroupBookProperties(
    bookLayout: BookLayout,
    sectionPosition: Vector3Type = new Vector3(0, 0, 0),
    bookScales: Vector2Type,
    spacingBetweenBooks: number
  ): ComputedGroupBookProperties {
    const xAxis = this.#computeAxisProperties(
      bookLayout.x,
      sectionPosition.x,
      bookScales.x,
      spacingBetweenBooks
    );
    const yAxis = this.#computeAxisProperties(
      bookLayout.y,
      sectionPosition.y,
      bookScales.y,
      spacingBetweenBooks
    );

    return {
      scale: new Vector2(xAxis.scale, yAxis.scale),
      position: new Vector3(xAxis.position, yAxis.position, sectionPosition.z),
      layoutPosition: new Vector2(xAxis.layoutPosition, yAxis.layoutPosition),
    };
  }
}
