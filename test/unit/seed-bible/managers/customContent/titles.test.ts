import { trimSiteName } from "@packages/seed-bible/seed-bible/managers/customContent/titles";

const PAGE = "https://frontlinebible.com/sermons/2025/10/good-things";

describe("trimSiteName", () => {
  it("takes the site's name off the end, whatever the separator", () => {
    for (const separator of ["–", "—", "-", "|", "·", "•", ":", "»"]) {
      expect(
        trimSiteName(
          `Good Things ${separator} Frontline Bible Church`,
          ["Frontline Bible Church"],
          PAGE
        )
      ).toBe("Good Things");
    }
  });

  it("takes it off the start too", () => {
    expect(
      trimSiteName(
        "Frontline Bible Church | Good Things",
        ["Frontline Bible Church"],
        PAGE
      )
    ).toBe("Good Things");
  });

  it("knows the site by its address when nothing names it", () => {
    expect(trimSiteName("Good Things – Frontline Bible Church", [], PAGE)).toBe(
      "Good Things"
    );
    expect(
      trimSiteName(
        "Grace en Español | Grace Community Church",
        ["Grace Community Church"],
        "https://www.gracechurch.org/espanol"
      )
    ).toBe("Grace en Español");
  });

  it("knows a site whose address shortens its name", () => {
    // Real: gracechurch.org titles end with its full name, and name it nowhere else.
    expect(
      trimSiteName(
        "Sermons by 180 Ministry Ministries | Grace Community Church",
        [],
        "https://gracechurch.org/180/sermons"
      )
    ).toBe("Sermons by 180 Ministry Ministries");
  });

  it("ignores case, spacing and punctuation when comparing names", () => {
    expect(
      trimSiteName(
        "Good Things - FRONTLINE  bible church.",
        ["Frontline Bible Church"],
        "https://example.org/"
      )
    ).toBe("Good Things");
  });

  it("leaves titles whose parts aren't the site's name", () => {
    for (const title of [
      "Grace – The Gift",
      "John 3:16 – For God So Loved the World",
      "Part 1 - The Beginning",
      "Well-Known Words",
      "Grace | Great Church Stories",
      "Growing in Grace – Grace and Church History",
    ]) {
      expect(
        trimSiteName(
          title,
          ["Frontline Bible Church"],
          "https://gracechurch.org/x"
        )
      ).toBe(title);
    }
  });

  it("never leaves a title empty", () => {
    expect(
      trimSiteName("Frontline Bible Church", ["Frontline Bible Church"], PAGE)
    ).toBe("Frontline Bible Church");
    expect(
      trimSiteName(
        "Frontline Bible Church – Frontline Bible Church",
        ["Frontline Bible Church"],
        PAGE
      )
    ).toBe("Frontline Bible Church");
  });
});
