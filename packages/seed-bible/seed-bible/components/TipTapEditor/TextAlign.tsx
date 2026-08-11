// MIT License

// Copyright (c) 2025, Tiptap GmbH

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

// 2026-07-14
// Modified to use class names instead of inline styles

import { Extension } from "@tiptap/core";

export interface TextAlignOptions {
  /**
   * The types where the text align attribute can be applied.
   * @default []
   * @example ['heading', 'paragraph']
   */
  types: string[];

  /**
   * The alignments which are allowed mapped to the class name that should be used for it.
   * @default { left: 'text-left', center: 'text-center', right: 'text-right', justify: 'text-justify' }
   * @example { left: 'text-left', right: 'text-right' }
   */
  alignments: Record<string, string>;

  /**
   * The default alignment.
   * @default null
   * @example 'center'
   */
  defaultAlignment: string | null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    textAlign: {
      /**
       * Set the text align attribute
       * @param alignment The alignment
       * @example editor.commands.setTextAlign('left')
       */
      setTextAlign: (alignment: string) => ReturnType;
      /**
       * Unset the text align attribute
       * @example editor.commands.unsetTextAlign()
       */
      unsetTextAlign: () => ReturnType;
      /**
       * Toggle the text align attribute
       * @param alignment The alignment
       * @example editor.commands.toggleTextAlign('right')
       */
      toggleTextAlign: (alignment: string) => ReturnType;
    };
  }
}

export const TextAlign = Extension.create<TextAlignOptions>({
  name: "textAlign",
  addOptions() {
    return {
      types: [],
      alignments: {
        left: "text-left",
        center: "text-center",
        right: "text-right",
        justify: "text-justify",
      },
      defaultAlignment: null,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          textAlign: {
            default: this.options.defaultAlignment,
            parseHTML: (element) => {
              const alignment = element.style.textAlign;

              return Object.keys(this.options.alignments).includes(alignment)
                ? alignment
                : this.options.defaultAlignment;
            },
            renderHTML: (attributes) => {
              if (!attributes.textAlign) {
                return {};
              }

              const className = this.options.alignments[attributes.textAlign];
              return { class: className };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setTextAlign:
        (alignment: string) =>
        ({ commands }) => {
          if (!Object.keys(this.options.alignments).includes(alignment)) {
            return false;
          }

          return this.options.types
            .map((type) =>
              commands.updateAttributes(type, { textAlign: alignment })
            )
            .some((response) => response);
        },

      unsetTextAlign:
        () =>
        ({ commands }) => {
          return this.options.types
            .map((type) => commands.resetAttributes(type, "textAlign"))
            .some((response) => response);
        },

      toggleTextAlign:
        (alignment) =>
        ({ editor, commands }) => {
          if (!Object.keys(this.options.alignments).includes(alignment)) {
            return false;
          }

          if (editor.isActive({ textAlign: alignment })) {
            return commands.unsetTextAlign();
          }
          return commands.setTextAlign(alignment);
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-l": () => this.editor.commands.setTextAlign("left"),
      "Mod-Shift-e": () => this.editor.commands.setTextAlign("center"),
      "Mod-Shift-r": () => this.editor.commands.setTextAlign("right"),
      "Mod-Shift-j": () => this.editor.commands.setTextAlign("justify"),
    };
  },
});

export default TextAlign;
