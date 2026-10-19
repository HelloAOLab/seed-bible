import { Mark, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    stepLink: {
      /**
       * Links the selection to playlist step `step` (1-based, as the editor
       * numbers them). With nothing selected, inserts "Step N" as the link.
       */
      setStepLink: (step: number, fallbackText?: string) => ReturnType;
      /** Removes a step link from the selection. */
      unsetStepLink: () => ReturnType;
    };
  }
}

const STEP_HREF = /^#step-(\d+)$/;

/** The step number a step link's href names, or null for any other href. */
export function parseStepLinkHref(href: string | null): number | null {
  const match = href ? STEP_HREF.exec(href) : null;
  if (!match) {
    return null;
  }
  const step = Number(match[1]);
  return Number.isInteger(step) && step > 0 ? step : null;
}

/**
 * A link from a text item or note to another step of the same playlist,
 * saved as `<a class="sb-step-link" href="#step-N">`: a fragment href the
 * sanitizer keeps, which the player turns into a jump to that step.
 */
export const StepLinkMark = Mark.create({
  name: "stepLink",
  inclusive: false,

  addAttributes() {
    return {
      step: {
        default: null,
        parseHTML: (element) => parseStepLinkHref(element.getAttribute("href")),
        renderHTML: (attributes) =>
          attributes.step ? { href: `#step-${attributes.step}` } : {},
      },
    };
  },

  parseHTML() {
    // Ahead of any plain link rule (priority 50), which would otherwise
    // claim the anchor and lose the step.
    return [{ tag: "a.sb-step-link", priority: 100 }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["a", mergeAttributes(HTMLAttributes, { class: "sb-step-link" }), 0];
  },

  addCommands() {
    return {
      setStepLink:
        (step, fallbackText) =>
        ({ chain, state }) => {
          const { from, to } = state.selection;
          if (from === to) {
            const text = fallbackText ?? `Step ${step}`;
            return chain()
              .insertContent({
                type: "text",
                text,
                marks: [{ type: this.name, attrs: { step } }],
              })
              .run();
          }
          return chain().setMark(this.name, { step }).run();
        },
      unsetStepLink:
        () =>
        ({ chain }) =>
          // Reaching out to the whole link lets a caret inside it remove it.
          chain().extendMarkRange(this.name).unsetMark(this.name).run(),
    };
  },
});

export default StepLinkMark;
