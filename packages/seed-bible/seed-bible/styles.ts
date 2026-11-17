// The foundation styles (tokens, resets, utilities) as a build entry of their
// own. No exported module imports them (`app/main.tsx`, the app's own mount
// point, isn't part of the package), so without this entry they'd be missing
// from the package. `libraryCssImportsPlugin({ firstEntry: "styles" })` puts
// them first in `style.css`, before the components' CSS that builds on them.
import "./app/styles/base.inline.css";
import "./app/styles/utilities.inline.css";
