/**
 * Taking a website's name off a page title: "Good Things – Frontline Bible
 * Church" becomes "Good Things". Sites put their name in every page title,
 * which repeats what the item's author and link already say.
 *
 * Only a part that matches the site's name is removed, never just whatever
 * follows a dash, so "Grace – The Gift" stays whole.
 */

/** A spaced separator between a title and a site name: ` – `, ` | `, ` · `… */
const SEPARATOR = /\s+[|–—\-·•:»/]\s+/g;

/** Letters and digits only, lowercased: how names are compared. */
function squash(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

/**
 * The site's own name from its address: `www.frontlinebible.com` gives
 * `frontlinebible`.
 */
function hostName(url: string): string | null {
  try {
    const labels = new URL(url).hostname.replace(/^www\./, "").split(".");
    const name = squash(
      labels.length > 1 ? labels[labels.length - 2]! : labels[0]!
    );
    return name.length >= 4 ? name : null;
  } catch {
    return null;
  }
}

/** Whether every letter of `short` appears in `long`, in order. */
function isInOrderWithin(short: string, long: string): boolean {
  let at = 0;
  for (const letter of long) {
    if (letter === short[at]) {
      at++;
    }
  }
  return at === short.length;
}

function isSiteName(
  part: string,
  names: readonly string[],
  host: string | null
): boolean {
  const squashed = squash(part);
  if (!squashed) {
    return false;
  }
  if (names.some((name) => squash(name) === squashed)) {
    return true;
  }
  if (!host) {
    return false;
  }
  // Only a part that starts with the whole host name, or one the host name
  // is an abbreviation of: "Grace Community Church" on gracechurch.org
  // has its letters in order, starting and ending the same way ("Grace
  // and Church History" doesn't end like it). "Grace" alone could
  // just as well be the title's own first word, so it never matches.
  return (
    squashed.startsWith(host) ||
    (squashed.slice(0, 3) === host.slice(0, 3) &&
      squashed.slice(-3) === host.slice(-3) &&
      squashed.length <= host.length * 2 &&
      isInOrderWithin(host, squashed))
  );
}

/**
 * The title without a leading or trailing part that's the site's name.
 * `names` are what the site calls itself (its `og:site_name`, the library's
 * default author…); `url` is the page's address, whose host name counts
 * too. A title that would be left empty is returned as it was.
 */
export function trimSiteName(
  title: string,
  names: readonly (string | null | undefined)[],
  url: string
): string {
  const known = names.filter((name): name is string => !!name?.trim());
  const host = hostName(url);
  const separators = [...title.matchAll(SEPARATOR)];
  if (separators.length === 0) {
    return title;
  }
  let start = 0;
  let end = title.length;
  const last = separators[separators.length - 1]!;
  if (isSiteName(title.slice(last.index! + last[0].length), known, host)) {
    end = last.index!;
  }
  const first = separators[0]!;
  if (
    first.index! < end &&
    isSiteName(title.slice(0, first.index!), known, host)
  ) {
    start = first.index! + first[0].length;
  }
  const trimmed = title.slice(start, end).trim();
  return trimmed ? trimmed : title;
}
