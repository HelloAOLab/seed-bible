import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";

type CompletePsalm = {
  chapter: number;
  book: "Psamls";
  bookId: "PSA";
};
type ConvertDividedPsalmsToCompleteType = (params: {
  book: string;
  chapter: number;
}) => CompletePsalm;

export const ConvertDividedPsalmsToComplete: ConvertDividedPsalmsToCompleteType =
  ({ book, chapter }) => {
    const dividedPsalmInfo = BibleVizDataRepository.getBookStaticInfo(book);

    if (dividedPsalmInfo && dividedPsalmInfo.startingIndex !== undefined) {
      return {
        chapter: chapter + dividedPsalmInfo.startingIndex,
        book: "Psamls",
        bookId: "PSA",
      };
    }

    throw new Error(
      "Divided psalm info not found at ConvertDividedPsalmsToComplete"
    );
  };
