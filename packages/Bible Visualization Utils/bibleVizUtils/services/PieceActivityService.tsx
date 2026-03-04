import type { Bot } from "../../../../typings/AuxLibraryDefinitions";
import {
  scriptureService,
  arrangementService,
} from "bibleVizUtils.services.index";
import type { Tab } from "bibleVizUtils.models.interfaces";
import type { PieceInfo as IPieceInfo } from "bibleVizUtils.models.interfaces";
import { PieceInfo } from "bibleVizUtils.models.PieceInfo";
import { BiblePieceType, ObjectPoolTags } from "bibleVizUtils.models.enums";
import type {
  BiblePieceTypeType,
  ObjectPoolTagsType,
} from "bibleVizUtils.models.enums";
import { PieceActivityIndicatorsRepository } from "bibleVizUtils.data.PieceActivityIndicatorsRepository";
import { PieceDataRegistry } from "bibleVizUtils.services.PieceDataRegistry";

// TODO: Implement a function registry system for the switch statements

export class PieceActivityService {
  static getPieceActivity({
    piece,
    desiredArrangementIndex = arrangementService.getCurrentArrangementIndex(),
  }: {
    piece: Bot;
    desiredArrangementIndex?: number;
  }) {
    const tabs: Tab[] = []; // TODO: Obtain my tabs
    const remoteTabs: Tab[] = []; // TODO: Obtain remote users tabs
    const allTabs: Tab[] = [...tabs, ...remoteTabs];
    const tabsPathMap: Map<
      Tab,
      [IPieceInfo, IPieceInfo, IPieceInfo, IPieceInfo]
    > = new Map();

    for (const tab of allTabs) {
      let { book, chapter } = tab.data;

      if (book === "Psalms")
        ({ book, chapter } = scriptureService.convertCompletePsalmsToDivided({
          chapter,
        }));

      const { found, arrangementIndex, testamentIndex, sectionIndex } =
        scriptureService.getBookInfoPathByName({
          name: book,
          arrangementIndex: desiredArrangementIndex,
        });
      if (found) {
        const arrangement =
          arrangementService.getArrangementByIndex(arrangementIndex);
        if (arrangement) {
          const testament = arrangement.testaments[testamentIndex as number];
          if (testament) {
            const testamentName = testament.name;
            const section = testament.sections[sectionIndex as number];
            if (section) {
              const sectionName = section.name;
              const path: [IPieceInfo, IPieceInfo, IPieceInfo, IPieceInfo] = [
                new PieceInfo({
                  typeOfPiece: BiblePieceType.StackTestament,
                  key: testamentName,
                }),
                new PieceInfo({
                  typeOfPiece: BiblePieceType.StackSection,
                  key: sectionName,
                }),
                new PieceInfo({
                  typeOfPiece: BiblePieceType.StackBook,
                  key: book,
                }),
                new PieceInfo({
                  typeOfPiece: BiblePieceType.StackChapter,
                  key: `${book} ${chapter}`,
                }),
              ];

              tabsPathMap.set(tab, path);
            }
          }
        }
      }
    }

    let key: string | undefined;
    let typeOfPiece: BiblePieceTypeType | undefined;
    switch (piece.tags.typeOfPiece as BiblePieceTypeType) {
      case BiblePieceType.StackTestament:
        key = piece.tags.testamentName;
        typeOfPiece = BiblePieceType.StackTestament;
        break;
      case BiblePieceType.StackSection:
      case BiblePieceType.StackSectionShadow:
        key = piece.tags.sectionName;
        typeOfPiece = BiblePieceType.StackSection;
        break;
      case BiblePieceType.StackSectionBook:
      case BiblePieceType.StackBook:
      case BiblePieceType.LayoutBook:
        key = piece.tags.bookName;
        typeOfPiece = BiblePieceType.StackBook;
        break;
      case BiblePieceType.StackChapter:
      case BiblePieceType.LayoutChapter:
        key = `${piece.tags.parentBookName} ${piece.tags.chapterNumber}`;
        typeOfPiece = BiblePieceType.StackChapter;
        break;
      default:
        break;
    }

    const activity = allTabs.filter((tab) => {
      const tabPath = tabsPathMap.get(tab);

      return tabPath?.some((pieceInfo) => {
        return (
          typeOfPiece &&
          pieceInfo.typeOfPiece === typeOfPiece &&
          key &&
          pieceInfo.key === key
        );
      });
    });

    return activity;
  }

  static getActivityIndicatorsForPiece(piece: Bot): Bot[] {
    switch (piece.tags.poolTag as ObjectPoolTagsType) {
      case ObjectPoolTags.InfoLabelTransformer:
        return piece.GetLabelElements().infoLabelUsersColor;
      case ObjectPoolTags.StackChapter:
      case ObjectPoolTags.LayoutBook:
      case ObjectPoolTags.LayoutChapter: {
        const pieceData = PieceDataRegistry.getPieceData(piece);

        if (!pieceData) return [];

        return PieceActivityIndicatorsRepository.getIndicatorsByPieceId(
          pieceData.id
        );
      }
      default:
        return [];
    }
  }

  static getActivityIndicatorByTag(
    piece: Bot,
    tag: string,
    value: any
  ): Bot | undefined {
    const indicators = this.getActivityIndicatorsForPiece(piece);
    return indicators.find((indicator) => indicator.tags[tag] === value);
  }

  static getExtraActivityIndicatorsForPiece(piece: Bot): {
    extraIndicatorContent: Bot | undefined;
    extraIndicatorBackground: Bot | undefined;
  } {
    const extraIndicatorContent = this.getActivityIndicatorByTag(
      piece,
      "isExtraContent",
      true
    );
    const extraIndicatorBackground = this.getActivityIndicatorByTag(
      piece,
      "isExtraBackground",
      true
    );

    return { extraIndicatorContent, extraIndicatorBackground };
  }

  static getPieceIndicatorByActivityIndex(
    piece: Bot,
    activityIndex: number
  ): Bot | undefined {
    const indicator = this.getActivityIndicatorByTag(
      piece,
      "activityIndex",
      activityIndex
    );
    return indicator;
  }
}
