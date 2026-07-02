import { featureChipsCss } from "ext_discover.css.featureChipsCss";

export function Chips(props: { label?: string; onDelete?: () => void }) {
  const { label, onDelete } = props;
  return (
    <>
      <style>{featureChipsCss}</style>
      <div className="chip">
        <span className="chip-label">{label}</span>
        <button className="chip-close" onClick={onDelete}>
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
    </>
  );
}
