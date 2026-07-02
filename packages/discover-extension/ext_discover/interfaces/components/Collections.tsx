export interface CollectionsProps {
  collections: Record<
    string,
    { name: string; collection: Record<string, any>[] }
  >;
  collection: Record<string, any>[] | null;
  currentCollection: string;
  collectionName: string;
  setCurrentCollection: (val: string) => void;
}
