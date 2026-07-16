import {
  sanitize,
  setSafeHtml,
  supportsSanitizerApi,
} from "@packages/seed-bible/seed-bible/managers/Sanitization";

/**
 * jsdom does not implement the native HTML Sanitizer API (`Element.setHTML`),
 * so by default these tests exercise the `dompurify` fallback path. The
 * "native sanitizer" blocks install a stub `setHTML` on `Element.prototype` to
 * drive the native branch instead.
 */
describe("Sanitization", () => {
  describe("supportsSanitizerApi", () => {
    it("returns false when Element.setHTML is unavailable (jsdom)", () => {
      expect(
        (Element.prototype as unknown as { setHTML?: unknown }).setHTML
      ).toBeUndefined();
      expect(supportsSanitizerApi()).toBe(false);
    });

    it("returns true when Element.setHTML is present", () => {
      const proto = Element.prototype as unknown as { setHTML?: unknown };
      proto.setHTML = function () {};
      try {
        expect(supportsSanitizerApi()).toBe(true);
      } finally {
        delete proto.setHTML;
      }
    });
  });

  describe("sanitize (dompurify fallback)", () => {
    it("keeps allowed tags and their text content", async () => {
      const result = await sanitize(
        "<p>Hello <strong>world</strong> and <em>friends</em></p>"
      );
      expect(result).toBe(
        "<p>Hello <strong>world</strong> and <em>friends</em></p>"
      );
    });

    it("strips script tags but keeps surrounding text", async () => {
      const result = await sanitize("<p>safe</p><script>alert('xss')</script>");
      expect(result).not.toContain("<script");
      expect(result).not.toContain("alert");
      expect(result).toContain("<p>safe</p>");
    });

    it("removes event handler attributes", async () => {
      const result = await sanitize('<p onclick="steal()">click me</p>');
      expect(result).not.toContain("onclick");
      expect(result).toContain("click me");
    });

    it("drops disallowed tags such as <img>", async () => {
      const result = await sanitize(
        '<img src="x" onerror="alert(1)"><p>text</p>'
      );
      expect(result).not.toContain("<img");
      expect(result).not.toContain("onerror");
      expect(result).toContain("<p>text</p>");
    });

    it("preserves allowed attributes like href, class, and title", async () => {
      const result = await sanitize(
        '<a href="https://example.com" class="link" title="Example">site</a>'
      );
      expect(result).toContain('href="https://example.com"');
      expect(result).toContain('class="link"');
      expect(result).toContain('title="Example"');
    });

    it("neutralizes javascript: URLs in href", async () => {
      const result = await sanitize(
        // eslint-disable-next-line no-script-url
        '<a href="javascript:alert(1)">bad</a>'
      );
      expect(result).not.toContain("javascript:");
      expect(result).toContain("bad");
    });

    it("returns an empty string for empty input", async () => {
      await expect(sanitize("")).resolves.toBe("");
    });

    it("escapes bare text that contains no markup", async () => {
      const result = await sanitize("just plain text");
      expect(result).toBe("just plain text");
    });
  });

  describe("sanitize (native sanitizer)", () => {
    let calls: Array<{ input: string; options: unknown }>;

    beforeEach(() => {
      calls = [];
      (Element.prototype as unknown as { setHTML: unknown }).setHTML =
        function (this: Element, input: string, options: unknown) {
          calls.push({ input, options });
          // Minimal stand-in behavior so innerHTML reflects the call.
          this.textContent = input;
        };
    });

    afterEach(() => {
      delete (Element.prototype as unknown as { setHTML?: unknown }).setHTML;
    });

    it("routes through Element.setHTML with the allow-list config", async () => {
      const html = "<p>native <strong>path</strong></p>";
      await sanitize(html);

      expect(calls).toHaveLength(1);
      expect(calls[0]?.input).toBe(html);
      expect(calls[0]?.options).toMatchObject({
        sanitizer: {
          elements: expect.arrayContaining(["p", "strong", "a"]),
          attributes: expect.arrayContaining(["href", "class"]),
        },
      });
    });
  });

  describe("setSafeHtml (dompurify fallback)", () => {
    it("writes sanitized HTML into the target element", async () => {
      const el = document.createElement("div");
      await setSafeHtml("<p>hello <strong>there</strong></p>", el);
      expect(el.innerHTML).toBe("<p>hello <strong>there</strong></p>");
    });

    it("strips scripts before assigning to the element", async () => {
      const el = document.createElement("div");
      await setSafeHtml("<p>ok</p><script>alert('x')</script>", el);
      expect(el.querySelector("script")).toBeNull();
      expect(el.innerHTML).toContain("<p>ok</p>");
    });

    it("removes event handler attributes from the element", async () => {
      const el = document.createElement("div");
      await setSafeHtml('<button onclick="hack()">go</button>', el);
      expect(el.innerHTML).not.toContain("onclick");
    });

    it("overwrites any existing content", async () => {
      const el = document.createElement("div");
      el.innerHTML = "<p>old</p>";
      await setSafeHtml("<p>new</p>", el);
      expect(el.innerHTML).toBe("<p>new</p>");
      expect(el.innerHTML).not.toContain("old");
    });
  });

  describe("setSafeHtml (native sanitizer)", () => {
    let calls: Array<{ target: Element; input: string; options: unknown }>;

    beforeEach(() => {
      calls = [];
      (Element.prototype as unknown as { setHTML: unknown }).setHTML =
        function (this: Element, input: string, options: unknown) {
          calls.push({ target: this, input, options });
          this.textContent = input;
        };
    });

    afterEach(() => {
      delete (Element.prototype as unknown as { setHTML?: unknown }).setHTML;
    });

    it("calls setHTML on the provided element rather than a detached one", async () => {
      const el = document.createElement("div");
      const html = "<p>native</p>";
      await setSafeHtml(html, el);

      expect(calls).toHaveLength(1);
      expect(calls[0]?.target).toBe(el);
      expect(calls[0]?.input).toBe(html);
      expect(calls[0]?.options).toMatchObject({
        sanitizer: {
          elements: expect.arrayContaining(["p"]),
          attributes: expect.arrayContaining(["href"]),
        },
      });
    });
  });
});
