import { Editor, Mark } from 'https://esm.sh/@tiptap/core';
import StarterKit from 'https://esm.sh/@tiptap/starter-kit';
import render from 'https://esm.run/preact-render-to-string';

import { Color } from 'https://esm.sh/@tiptap/extension-color'
import ListItem from 'https://esm.sh/@tiptap/extension-list-item'
import TextStyle from 'https://esm.sh/@tiptap/extension-text-style'
import Underline from 'https://esm.sh/@tiptap/extension-underline'
import Highlight from 'https://esm.sh/@tiptap/extension-highlight'
import Blockquote from 'https://esm.sh/@tiptap/extension-blockquote'
import Heading from 'https://esm.sh/@tiptap/extension-heading'

const extensions = [
  Color.configure({ types: [TextStyle.name, ListItem.name] }),
  TextStyle.configure({ types: [ListItem.name] }),
  Underline,
  Highlight,
  Blockquote,
  Heading.configure({
    levels: [1, 2, 3],
  }),
  StarterKit.configure({
    bulletList: {
      keepMarks: true,
      keepAttributes: false, // TODO : Making this as `false` becase marks are not preserved when I try to preserve attrs, awaiting a bit of help
    },
    orderedList: {
      keepMarks: true,
      keepAttributes: false, // TODO : Making this as `false` becase marks are not preserved when I try to preserve attrs, awaiting a bit of help
    },
  })
]

const Clickable = Mark.create({
  name: 'clickable',

  addAttributes() {
    return {
      value: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-clickable]',
        getAttrs: dom => ({
          value: dom.getAttribute('data-value'),
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', {
      ...HTMLAttributes,
      'data-clickable': 'true',
      'data-value': HTMLAttributes.value,
    }, 0];
  },
});

globalThis.TTEditor = Editor;
globalThis.TTExtensions = [...extensions, Clickable];
globalThis.HTMLRender = render;