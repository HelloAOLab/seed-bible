import "./ToastHost.css";
import type { AppState } from "../../managers/SeedBibleStateManager";

/**
 * Renders the app-level toast: a single popup at the bottom of the screen.
 *
 * Reads {@link AppState.currentToast} reactively and renders nothing when there
 * is no active toast. Keyed by the toast id so the slide-in animation replays
 * even when the same message is shown again.
 */
export function ToastHost(props: { app: AppState }) {
  const toast = props.app.currentToast.value;
  if (!toast) {
    return null;
  }

  return (
    <div className="sb-toast-host" role="status" aria-live="polite">
      {toast.onClick ? (
        <button
          type="button"
          className="sb-toast sb-toast-clickable"
          key={toast.id}
          onClick={toast.onClick}
        >
          <span className="sb-toast-message">{toast.message}</span>
          {toast.hint && <span className="sb-toast-hint">{toast.hint}</span>}
        </button>
      ) : (
        <div className="sb-toast" key={toast.id}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
