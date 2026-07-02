import { PlaylistLinkedContainer } from "ext_discover.components.PlaylistLinkedContainer";
import { openPlaylistLinkModal } from "ext_discover.helper.openPlaylistLinkModal";
import type { CollectionsProps } from "ext_discover.interfaces.components.Collections";
import { Button } from "ext_discover.features.components.Button";
import { Select } from "ext_discover.features.components.Select";

const G = globalThis as Record<string, any>;

export function Collections({
  collections,
  collection,
  currentCollection,
  collectionName,
  setCurrentCollection,
}: CollectionsProps) {
  const collectionKeys = Object.keys(collections);
  const collectionsOptions = collectionKeys.map((key) => ({
    label: collections[key].name,
    value: key,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", padding: "12px" }}>
      {collectionKeys.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Select
            style={{ padding: "12px" }}
            secondary
            value={currentCollection}
            onChangeListener={(val: string) => {
              setCurrentCollection(val);
            }}
            name="Select Collection:"
            options={collectionsOptions}
          />
          <Button
            onClick={() => {
              G.EDIT_COLLECTION_ID = currentCollection;
              openPlaylistLinkModal({
                currentCollection: collection || [],
                name: collectionName,
              });
            }}
            secondary
          >
            Edit
          </Button>

          <Button
            onClick={() => {
              const newCollections = { ...collections };
              delete newCollections[currentCollection];
              G.COLLECTION_SETTER && G.COLLECTION_SETTER(newCollections);
            }}
            secondaryAlt
          >
            Delete
          </Button>
        </div>
      )}
      <div className="playlist-container-data">
        {collectionKeys.length === 0 ? (
          <p> No Collections Saved. </p>
        ) : !collection ? (
          <p> No Collections Selected. </p>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              flexDirection: "column",
            }}
          >
            {collection.map((coll) => (
              <div
                key={coll.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "12px 0",
                  maxHeight: "90dvh",
                  width: "100%",
                  overflow: "auto",
                  position: "relative",
                }}
              >
                <PlaylistLinkedContainer
                  playlist={coll}
                  linkingMode={false}
                  clickPass={true}
                />
              </div>
            ))}
          </div>
        )}
        <p
          onClick={() => {
            openPlaylistLinkModal({
              idsMap: {},
            });
          }}
          className="playlist-action secondary self-start"
        >
          <span class="material-symbols-outlined unfollow">playlist_add</span>
          <span>Add New Collection</span>
        </p>
      </div>
    </div>
  );
}
