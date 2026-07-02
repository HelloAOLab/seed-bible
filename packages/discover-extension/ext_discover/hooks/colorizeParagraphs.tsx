export function colorizeParagraphs(html: string) {
  const hashtagRegex = /(^|[^\w#])(#[A-Za-z0-9_]+(?:-[A-Za-z0-9_]+)*)/g;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  doc.querySelectorAll("span#hashtag").forEach((el: any) => {
    const text = el.textContent || "";

    const match = text.match(/^(#[A-Za-z0-9_]+(?:-[A-Za-z0-9_]+)*)([\s\S]*)$/);
    if (!match) return;

    const hashtag = match[1];
    let rest: string | undefined = match[2];

    if (!rest?.trim()) {
      el.textContent = hashtag;
      return;
    }

    el.textContent = hashtag;

    rest = rest.replace(/^\s+/, "");
    const spaceNode = doc.createTextNode(" ");

    const extraSpan = doc.createElement("span");
    extraSpan.textContent = rest;

    el.parentNode.insertBefore(spaceNode, el.nextSibling);
    el.parentNode.insertBefore(extraSpan, spaceNode.nextSibling);
  });

  const walker = document.createTreeWalker(
    doc.body,
    NodeFilter.SHOW_TEXT,
    null
  );

  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  textNodes.forEach((textNode: any) => {
    if (textNode.parentElement?.id === "hashtag") return;

    const text = textNode.nodeValue || "";
    if (!hashtagRegex.test(text)) return;

    hashtagRegex.lastIndex = 0;

    const fragment = doc.createDocumentFragment();
    let lastIndex = 0;

    text.replace(
      hashtagRegex,
      (match: any, prefix: any, tag: any, offset: any) => {
        fragment.appendChild(doc.createTextNode(text.slice(lastIndex, offset)));

        if (prefix) fragment.appendChild(doc.createTextNode(prefix));

        const span = doc.createElement("span");
        span.textContent = tag;
        span.id = "hashtag";

        fragment.appendChild(span);

        lastIndex = offset + match.length;
        return match;
      }
    );

    fragment.appendChild(doc.createTextNode(text.slice(lastIndex)));
    textNode.replaceWith(fragment);
  });

  return doc.body.innerHTML;
}
