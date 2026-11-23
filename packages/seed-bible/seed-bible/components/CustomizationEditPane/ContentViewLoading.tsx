import { useI18n } from "../../i18n/I18nManager";
import { Skeleton, SkeletonContainer } from "../Skeleton/Skeleton";

/** The content library's placeholder, for both while its code loads and while its data does. */
export function ContentViewLoading() {
  const { t } = useI18n();
  return (
    <div className="sb-settings-page sb-cz-page">
      <SkeletonContainer
        label={t("custom-content-loading", {
          defaultValue: "Loading the content library…",
        })}
      >
        <Skeleton width="100%" height="12rem" radius="var(--sb-radius-md)" />
      </SkeletonContainer>
    </div>
  );
}
