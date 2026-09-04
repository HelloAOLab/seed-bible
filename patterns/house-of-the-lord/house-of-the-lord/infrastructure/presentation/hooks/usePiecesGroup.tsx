import type { PieceCatalogGroup } from "../../../application/ports/out/PieceCatalog";
import type {
  PieceData,
  UsePiecesGroupType,
} from "../components/containers/PiecesGroup";
import { useNavMenuContext } from "../context/NavMenu/NavMenuContext";

const { useMemo } = os.appHooks;

type UsePiecesGroup = (props: {
  isFolded: boolean;
  group: PieceCatalogGroup;
}) => UsePiecesGroupType;

const FOLDED_ICON = "▸";
const UNFOLDED_ICON = "▾";

export const usePiecesGroup: UsePiecesGroup = ({ isFolded, group }) => {
  const { menuState, catalog, controller } = useNavMenuContext();

  const pieces = useMemo<PieceData[]>(
    () =>
      group.keys.map((key) => ({
        key,
        className:
          key === menuState.selectedPiece
            ? "hotl-piece hotl-piece-active"
            : "hotl-piece",
        onClick: () => controller.handlePieceClick(key),
        children: catalog.getPieceLabel(menuState.experience, key),
      })),
    [
      group.keys,
      catalog,
      controller,
      menuState.experience,
      menuState.selectedPiece,
    ]
  );

  const toggleIcon = useMemo(() => {
    return isFolded ? FOLDED_ICON : UNFOLDED_ICON;
  }, [isFolded]);

  const toggleLabel = group.label;

  return {
    pieces,
    toggleIcon,
    toggleLabel,
  };
};
