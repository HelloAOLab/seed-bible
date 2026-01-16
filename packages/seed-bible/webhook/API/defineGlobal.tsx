globalThis.ENCRYPT_SALT_KEY = "r7KD5gsKlV6j53jxw6Ul";

globalThis.API = thisBot;


function autoTagHTML(html) {
    const hashtagRegex = /(^|\s)(#[\w]+)/g;
  
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
  
    const walker = document.createTreeWalker(
      doc.body,
      NodeFilter.SHOW_TEXT,
      null
    );
  
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
  
    textNodes.forEach(textNode => {
      if (textNode.parentElement?.tagName === 'SPAN') return;
      if (!hashtagRegex.test(textNode.nodeValue)) return;
  
      const fragment = doc.createDocumentFragment();
      let lastIndex = 0;
  
      textNode.nodeValue.replace(hashtagRegex, (match, space, tag, index) => {
        fragment.appendChild(
          doc.createTextNode(textNode.nodeValue.slice(lastIndex, index + space.length))
        );
  
        const span = doc.createElement('span');
        span.textContent = tag;
        span.id = 'hashtag';
        span.style.color = randomColor();
  
        fragment.appendChild(span);
        lastIndex = index + space.length + tag.length;
      });
  
      fragment.appendChild(
        doc.createTextNode(textNode.nodeValue.slice(lastIndex))
      );
  
      textNode.replaceWith(fragment);
    });
  
    return doc.body.innerHTML;
  }
  
  function randomColor() {
    return `hsl(${Math.random() * 360}, 70%, 55%)`;
  }
  
globalThis.ColorizeParagraphs = autoTagHTML;

function extractHashtagsFromHTML(html) {
  const hashtagRegex = /#[\w]+/g;

  const doc = new DOMParser().parseFromString(html, "text/html");

  // Get only visible text (ignores tags like <span>, <p>, <br>, etc.)
  const text = doc.body.textContent || "";

  // Extract + remove duplicates
  return [...new Set(text.match(hashtagRegex) || [])];
}

globalThis.ExtractHashtagsFromHTML = extractHashtagsFromHTML;