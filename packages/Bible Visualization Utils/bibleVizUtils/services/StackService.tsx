import type {
  Vector2 as Vector2Type,
  Vector3 as Vector3Type,
} from "../../../../typings/AuxLibraryDefinitions";
import type { BookInfo } from "bibleVizUtils.data.BibleVizDataRepository";

export interface BookLayoutAxis {
  from: number;
  to: number;
}

export interface BookLayout {
  x: BookLayoutAxis;
  y: BookLayoutAxis;
}

export interface ComputedGroupBookProperties {
  scale: Vector2Type;
  position: Vector3Type;
  layoutPosition: Vector2Type;
}

export interface ServiceRepository {
  getStackPieceMeasurement: (key: "BookScales") => Vector2Type;
  getStackSpacing: (key: "BetweenBooks") => number;
}

export class StackService {
  #repository: ServiceRepository;

  constructor(repository: ServiceRepository) {
    this.#repository = repository;
  }

  #computeAxisProperties(
    axisLayout: BookLayoutAxis,
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

  computeGroupBookProperties = (
    bookLayout: BookLayout,
    sectionPosition: Vector3Type = new Vector3(0, 0, 0)
  ): ComputedGroupBookProperties => {
    const bookScales = this.#repository.getStackPieceMeasurement("BookScales");
    const spacing = this.#repository.getStackSpacing("BetweenBooks");

    const xAxis = this.#computeAxisProperties(
      bookLayout.x,
      sectionPosition.x,
      bookScales.x,
      spacing
    );

    const yAxis = this.#computeAxisProperties(
      bookLayout.y,
      sectionPosition.y,
      bookScales.y,
      spacing
    );

    return {
      scale: new Vector2(xAxis.scale, yAxis.scale),
      position: new Vector3(xAxis.position, yAxis.position, sectionPosition.z),
      layoutPosition: new Vector2(xAxis.layoutPosition, yAxis.layoutPosition),
    };
  };

  getSectionLevels = (books: BookInfo[]) => {
    const levels: BookInfo[][] = [];
    const groupsIncluded: number[] = [];
    for (const book of books) {
      if (book.group) {
        if (groupsIncluded.includes(book.group)) continue;

        const group: BookInfo[] = books.filter((currBook) => {
          return currBook.group === book.group;
        });
        levels.push(group);
        groupsIncluded.push(book.group);
      } else {
        levels.push([book]);
      }
    }
    return levels;
  };
}
