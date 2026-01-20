function autoTagHTML(html) {
  // ✅ supports punctuation before hashtag + hyphens inside hashtag
  const hashtagRegex = /(^|[^\w#])(#[A-Za-z0-9_]+(?:-[A-Za-z0-9_]+)*)/g;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // ✅ 1) Fix WRONG existing hashtag spans like:
  // <span id="hashtag">#tagname i am her boy</span>
  doc.querySelectorAll("span#hashtag").forEach((el) => {
    const text = el.textContent || "";

    // ✅ allow hyphens in the hashtag
    const match = text.match(/^(#[A-Za-z0-9_]+(?:-[A-Za-z0-9_]+)*)([\s\S]*)$/);
    if (!match) return;

    const hashtag = match[1];
    let rest = match[2];

    if (!rest.trim()) {
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

  // ✅ 2) Tag new hashtags in text nodes (skip existing hashtag span)
  const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);

  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  textNodes.forEach((textNode) => {
    if (textNode.parentElement?.id === "hashtag") return;

    const text = textNode.nodeValue || "";
    if (!hashtagRegex.test(text)) return;

    hashtagRegex.lastIndex = 0;

    const fragment = doc.createDocumentFragment();
    let lastIndex = 0;

    text.replace(hashtagRegex, (match, prefix, tag, offset) => {
      fragment.appendChild(doc.createTextNode(text.slice(lastIndex, offset)));

      // prefix might be punctuation or space; keep it
      if (prefix) fragment.appendChild(doc.createTextNode(prefix));

      const span = doc.createElement("span");
      span.textContent = tag;
      span.id = "hashtag";
      // span.style.color = randomColor();

      fragment.appendChild(span);

      lastIndex = offset + match.length;
      return match;
    });

    fragment.appendChild(doc.createTextNode(text.slice(lastIndex)));
    textNode.replaceWith(fragment);
  });

  return doc.body.innerHTML;
}
  
function extractHashtagsFromHTML(html: string) {
  const hashtagRegex = /#[\w]+/g;

  const doc = new DOMParser().parseFromString(html, "text/html");

  // Get only visible text (ignores tags like <span>, <p>, <br>, etc.)
  const text = doc.body.textContent || "";

  // Extract + remove duplicates
  return [...new Set(text.match(hashtagRegex) || [])];
}

function uncolorizeHashtags(html: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Helper: unwrap a node (replace it by its children)
  function unwrap(node: any) {
    const parent = node.parentNode;
    if (!parent) return;

    while (node.firstChild) parent.insertBefore(node.firstChild, node);
    parent.removeChild(node);
  }

  // Helper: true if span is basically just a color wrapper (or empty styling)
  function isColorWrapperSpan(span: any) {
    if (!(span instanceof HTMLElement)) return false;
    if (span.tagName !== "SPAN") return false;

    // If it has attributes other than style, we won't unwrap (safer)
    const attrs = [...span.attributes].map((a) => a.name);
    const allowedAttrs = ["style"];
    if (attrs.some((a) => !allowedAttrs.includes(a))) return false;

    const style = (span.getAttribute("style") || "").trim();
    if (!style) return true; // empty wrapper <span>

    // allow ONLY color in style
    const normalized = style.replace(/\s+/g, "").toLowerCase();
    return /^color:[^;]+;?$/.test(normalized);
  }

  // 1) Find hashtag spans and clean them
  const hashtagSpans = [...doc.querySelectorAll("span#hashtag")];

  hashtagSpans.forEach((tagSpan) => {
    // remove id
    tagSpan.removeAttribute("id");

    // remove inline color
    (tagSpan as any).style.color = "";
    if (!tagSpan.getAttribute("style")?.trim()) {
      tagSpan.removeAttribute("style");
    }

    // 2) unwrap parent color wrappers (could be multiple levels)
    let parent = tagSpan.parentElement;
    while (parent && parent.tagName === "SPAN" && isColorWrapperSpan(parent)) {
      const nextParent = parent.parentElement; // store before unwrap
      unwrap(parent);
      parent = nextParent;
    }
  });

  return doc.body.innerHTML;
}

export { extractHashtagsFromHTML, autoTagHTML as ColorizeParagraphs , uncolorizeHashtags };