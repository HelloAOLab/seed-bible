export function uncolorizeHashtags(html: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  function unwrap(node: any) {
    const parent = node.parentNode;
    if (!parent) return;

    while (node.firstChild) parent.insertBefore(node.firstChild, node);
    parent.removeChild(node);
  }

  function isColorWrapperSpan(span: any) {
    if (!(span instanceof HTMLElement)) return false;
    if (span.tagName !== "SPAN") return false;

    const attrs = [...span.attributes].map((a) => a.name);
    const allowedAttrs = ["style"];
    if (attrs.some((a) => !allowedAttrs.includes(a))) return false;

    const style = (span.getAttribute("style") || "").trim();
    if (!style) return true;

    const normalized = style.replace(/\s+/g, "").toLowerCase();
    return /^color:[^;]+;?$/.test(normalized);
  }

  const hashtagSpans = [...doc.querySelectorAll("span#hashtag")];

  hashtagSpans.forEach((tagSpan) => {
    tagSpan.removeAttribute("id");

    (tagSpan as any).style.color = "";
    if (!tagSpan.getAttribute("style")?.trim()) {
      tagSpan.removeAttribute("style");
    }

    let parent = tagSpan.parentElement;
    while (parent && parent.tagName === "SPAN" && isColorWrapperSpan(parent)) {
      const nextParent = parent.parentElement;
      unwrap(parent);
      parent = nextParent;
    }
  });

  return doc.body.innerHTML;
}
