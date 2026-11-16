import { MaterialIcon } from "@packages/seed-bible/seed-bible/components";
import { useI18n } from "@packages/seed-bible/seed-bible/i18n";
import { EXPERIENCE_META } from "./experienceMeta";
import type { AnyPieceKey, ExperienceKey } from "./experience";

export interface ExhibitPiece {
  key: AnyPieceKey;
  label: string;
}

/**
 * Content for one House of the Lord discover entry. The pane already renders
 * the experience name (`title`) and its blurb (`description`) above this, so
 * this only owns the actions: one primary "explore the whole experience"
 * button, plus a chip per piece the current chapter references.
 */
export function ExhibitCard(props: {
  experience: ExperienceKey;
  experienceName: string;
  pieces: ExhibitPiece[];
  onOpen: (key?: AnyPieceKey) => void;
}) {
  // Literal rather than `extensionId`: the i18n lint rule resolves the
  // namespace statically to check the key against the extension's translations.
  const { t } = useI18n("house-of-the-lord");
  const Icon = EXPERIENCE_META[props.experience].icon;

  return (
    <div className="sb-hotl-exhibit">
      <button
        type="button"
        className="sb-hotl-exhibit-primary"
        onClick={() => props.onOpen()}
      >
        <Icon />
        <span className="sb-hotl-exhibit-primary-label">
          {t("discover-explore-experience", {
            defaultValue: "Explore the {{name}}",
            name: props.experienceName,
          })}
        </span>
        <MaterialIcon className="sb-hotl-exhibit-chevron" aria-hidden="true">
          chevron_right
        </MaterialIcon>
      </button>

      {props.pieces.length > 0 ? (
        <div className="sb-hotl-exhibit-pieces">
          <span className="sb-hotl-exhibit-pieces-label">
            {t("discover-pieces-label", { defaultValue: "In this chapter" })}
          </span>
          <ul className="sb-hotl-exhibit-piece-list">
            {props.pieces.map((piece) => (
              <li key={piece.key}>
                <button
                  type="button"
                  className="sb-hotl-exhibit-piece"
                  onClick={() => props.onOpen(piece.key)}
                >
                  {piece.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
