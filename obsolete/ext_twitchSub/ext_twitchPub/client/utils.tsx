export const joinParts = (config: {
  payload: string;
  uid: string;
  currentPart: number;
  parts: number;
}) => {
  const { payload, uid, currentPart, parts } = config;
  if (parts && parts > 0) {
    const allParts = masks?.[`receivedParts_${uid}`]
      ? [...JSON.parse(masks[`receivedParts_${uid}`])]
      : [];
    if (allParts.length < parts) {
      allParts.push(config);
      setTagMask(
        thisBot,
        `receivedParts_${uid}`,
        JSON.stringify(allParts),
        "local"
      );
    } else {
      allParts.push(config);
    }
    if (allParts.length === parts) {
      const sortedParts = allParts.sort(
        (a, b) => a.currentPart - b.currentPart
      );
      const fullPayload = sortedParts.reduce(
        (acc, part) => acc + part.payload,
        ""
      );
      setTagMask(thisBot, `receivedParts_${uid}`, null, "local");
      return fullPayload;
    } else {
      return null;
    }
  } else {
    return payload;
  }
};
