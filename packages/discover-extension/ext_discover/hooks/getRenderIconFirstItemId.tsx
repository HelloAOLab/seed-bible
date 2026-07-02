const G = globalThis as Record<string, any>;

export function getRenderIconFirstItemId(mylist: any[]): string {
  let name = "🎶";
  const firstItem = mylist.find((ele: any) => G.ValidTypes[ele?.type]);
  if (firstItem) {
    const lowerCase = firstItem?.additionalInfo?.book?.toLocaleLowerCase();
    const lowerCaseBookMapping =
      G.thisBot?.tags?.LowerCaseBookMapping ?? G.LowerCaseBookMapping;
    name =
      firstItem.additionalInfo.data.bookId ||
      firstItem.additionalInfo.data.id ||
      firstItem.additionalInfo.data.bookId ||
      firstItem.additionalInfo.chapterData.id ||
      firstItem.additionalInfo.chapterData.bookId ||
      lowerCaseBookMapping?.[lowerCase];
  }
  return name;
}
