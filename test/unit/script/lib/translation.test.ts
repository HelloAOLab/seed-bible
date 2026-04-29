import {
  decodeValueFromHtml,
  encodeValueForHtml,
} from "../../../../script/lib/translation";

describe("translation HTML helpers", () => {
  describe("encodeValueForHtml", () => {
    it("wraps placeholders in non-translatable spans", () => {
      expect(encodeValueForHtml("Shared {{book}}")).toBe(
        'Shared <span translate="no">{{book}}</span>'
      );
    });

    it("HTML-encodes non-placeholder text while preserving placeholders", () => {
      expect(encodeValueForHtml('Fish & <chips> "{{count}}"')).toBe(
        'Fish &amp; &lt;chips&gt; &quot;<span translate="no">{{count}}</span>&quot;'
      );
    });
  });

  describe("decodeValueFromHtml", () => {
    it("removes translate=no span wrappers around placeholders", () => {
      expect(
        decodeValueFromHtml('Compartido <span translate="no">{{book}}</span>')
      ).toBe("Compartido {{book}}");
    });

    it("HTML-decodes translated output after removing placeholder wrappers", () => {
      expect(
        decodeValueFromHtml(
          'Pescado &amp; patatas &lt;buenas&gt; &quot;<span translate="no">{{count}}</span>&quot;'
        )
      ).toBe('Pescado & patatas <buenas> "{{count}}"');
    });
  });
});
