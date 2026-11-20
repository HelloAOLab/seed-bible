import { getUserDisplayName } from "@packages/seed-bible/seed-bible/components/Avatar/Avatar";
import type { ConnectedSessionUser } from "@packages/seed-bible/seed-bible/managers/SessionsManager";
import { mockTranslate } from "../testUtils/mockI18n";

function user(
  overrides: Partial<ConnectedSessionUser> &
    Pick<ConnectedSessionUser, "visual">
): ConnectedSessionUser {
  return {
    connectionId: "conn-1",
    userId: "abcdefghijklmnop",
    isSelf: false,
    isActive: true,
    joinedAtMs: null,
    profile: null,
    ...overrides,
  };
}

const redTree = {
  color: "#F87171",
  colorName: "red",
  defaultIcon: "nature",
};

describe("getUserDisplayName", () => {
  it("uses the trimmed profile name when there is one", () => {
    expect(
      getUserDisplayName(
        user({ profile: { name: "  Ada  " }, visual: redTree }),
        mockTranslate
      )
    ).toBe("Ada");
  });

  it("falls back to Color + Icon when the profile is missing", () => {
    expect(getUserDisplayName(user({ visual: redTree }), mockTranslate)).toBe(
      "Red Tree (Anonymous)"
    );
  });

  // Brand-new accounts are created with `name: ""`. `??` alone used to leave
  // a blank label beside the avatar in the participant list.
  it("treats an empty profile name as no name", () => {
    expect(
      getUserDisplayName(
        user({ profile: { name: "" }, visual: redTree }),
        mockTranslate
      )
    ).toBe("Red Tree (Anonymous)");
  });

  it("treats a whitespace-only profile name as no name", () => {
    expect(
      getUserDisplayName(
        user({ profile: { name: "   " }, visual: redTree }),
        mockTranslate
      )
    ).toBe("Red Tree (Anonymous)");
  });

  it("uses the session visual, not a re-hash of the user id", () => {
    // Sessions key the avatar off connectionId; the label must match that
    // picture even when the userId would hash to a different pair.
    expect(
      getUserDisplayName(
        user({
          userId: "someone-else",
          visual: {
            color: "#60A5FA",
            colorName: "blue",
            defaultIcon: "pets",
          },
        }),
        mockTranslate
      )
    ).toBe("Blue Dog (Anonymous)");
  });
});
