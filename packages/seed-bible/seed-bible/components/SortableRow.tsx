import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ComponentChildren, JSX } from "preact";

/**
 * Props dnd-kit wants spread onto the drag *handle* element (not the row).
 * Loosely typed (not `JSX.HTMLAttributes`) because dnd-kit's `attributes`
 * types its ARIA props as plain `string` (built for React, not Preact's
 * stricter `Signalish<AriaRole>`-style aria types) — spreading them onto a
 * real `<button>` works fine at runtime regardless.
 */
export type SortableHandleProps = Record<string, unknown> & {
  ref: (element: HTMLElement | null) => void;
};

interface SortableRowProps extends Omit<
  JSX.HTMLAttributes<HTMLLIElement>,
  "children" | "id"
> {
  /** The row's array index for the duration of one drag gesture — reorders
   * are only committed on drop, so plain indices stay valid as ids for the
   * whole gesture without needing a stable per-item id on the data itself. */
  id: number;
  className: string;
  children: (handleProps: SortableHandleProps) => ComponentChildren;
}

/**
 * `<li>` wrapper around `@dnd-kit/sortable`'s `useSortable`, shared by the
 * playlist editor's Items list and the playback Queue list. Each row is its
 * own component instance so `useSortable` (a hook) is never called from
 * inside a parent's `.map()` callback.
 *
 * No `DragOverlay` is used — the dragged row moves in place via its own
 * `transform`, and siblings animate out of the way via dnd-kit's default
 * sortable behavior. `setActivatorNodeRef` is handed to the caller's
 * drag-handle button (not the `<li>` itself), so keyboard focus and the
 * `aria-*`/`tabIndex` attributes dnd-kit's `attributes` supplies land on the
 * actual interactive element.
 */
export function SortableRow(props: SortableRowProps) {
  const { id, className, children, ...rest } = props;
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? undefined,
  };

  const handleProps: SortableHandleProps = {
    ...attributes,
    ...listeners,
    ref: setActivatorNodeRef,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={className + (isDragging ? " sb-discover-item--dragging" : "")}
      {...rest}
    >
      {children(handleProps)}
    </li>
  );
}
