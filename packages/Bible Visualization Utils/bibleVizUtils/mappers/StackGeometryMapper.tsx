import type {
  Vector2 as Vector2Type,
  Vector3 as Vector3Type,
} from "../../../../typings/AuxLibraryDefinitions";
import type {
  BookLayout,
  ComputedGroupBookProperties,
} from "bibleVizUtils.models.canvas";
import type { Span } from "bibleVizUtils.models.commonTypes";

export class StackGeometryMapper {
  private static computeAxisProperties(
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

  static computeGroupBookProperties(
    bookLayout: BookLayout,
    sectionPosition: Vector3Type = new Vector3(0, 0, 0),
    bookScales: Vector2Type,
    spacingBetweenBooks: number
  ): ComputedGroupBookProperties {
    const xAxis = this.computeAxisProperties(
      bookLayout.x,
      sectionPosition.x,
      bookScales.x,
      spacingBetweenBooks
    );
    const yAxis = this.computeAxisProperties(
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
