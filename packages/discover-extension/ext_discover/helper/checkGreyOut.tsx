import { checkIfNeedToSkip } from "ext_discover.helper.checkIfNeedToSkip";

export function checkGreyOut(that?: any) {
  const th = that;

  return th.map((item: any) => {
    const skip = checkIfNeedToSkip({ dataItem: item });
    return {
      ...item,
      greyOut: skip,
    };
  });
}
