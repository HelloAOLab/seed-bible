import { fetchAnnotationsData } from "ext_discover.helper.fetchAnnotationsData";

export function bookDataUpdated(that?: any) {
  const G = globalThis as any;
  fetchAnnotationsData({ ...G.CurrentBookData });
  fetchAnnotationsData({ ...G.CurrentBookData, prev: true });
  fetchAnnotationsData({ ...G.CurrentBookData, next: true });
}
