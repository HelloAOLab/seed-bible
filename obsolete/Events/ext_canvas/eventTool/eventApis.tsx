const baseUrl = "https://aolab-bible-api.netlify.app/api";

const eventApis = {
  animations: {
    getItems: `${baseUrl}/animation/getAnimations`,
    searchItem: `${baseUrl}/animation/searchAnimations`,
    getItemByUid: `${baseUrl}/animation/getAnimationByName`,
  },
  books: {
    getItemByUid: `${baseUrl}/books/getBookByUid`,
  },
  chapters: {
    getItemByUid: `${baseUrl}/chapters/getChapterByUid`,
  },
  common: {
    getItemByUid: `${baseUrl}/common/getItemDataByUid`,
  },
  easton: {
    getItemByUid: `${baseUrl}/easton/getEastonByUid`,
  },
  events: {
    getItemByUid: `${baseUrl}/events/getEventByUid`,
  },
  peoples: {
    getItems: `${baseUrl}/peoples/getPeoples`,
    searchItem: `${baseUrl}/peoples/searchPeople`,
    getItemByUid: `${baseUrl}/peoples/getPeopleByUid`,
  },
  periods: {
    getItemByUid: `${baseUrl}/periods/getPeriodByUid`,
  },
  places: {
    getItems: `${baseUrl}/places/getPlacesData`,
    searchItem: `${baseUrl}/places/searchPlaceData`,
    getItemByUid: `${baseUrl}/places/getPlaceByUid`,
  },
  verses: {
    getItemByUid: `${baseUrl}/verses/getVerseByUid`,
  },
  simulation: {
    getItems: `${baseUrl}/sim/getItems`,
    searchItem: `${baseUrl}/sim/searchItem`,
    getItemByUid: `${baseUrl}/sim/getItemByUid`,
  },
  datalayer: {
    getRandomWords: `${baseUrl}/datalayer/getRandomWords`,
    getUserData: `${baseUrl}/datalayer/getUserHistory`,
    postUserData: `${baseUrl}/datalayer/postUserHistory`,
  },
};

const aquiferApis = {
  deities: {
    getItems: `${baseUrl}/acai/deities/getItems`,
    searchItem: `${baseUrl}/acai/deities/searchItem`,
    getItemByUid: `${baseUrl}/acai/deities/getByID`,
  },
  fauna: {
    getItems: `${baseUrl}/acai/fauna/getItems`,
    searchItem: `${baseUrl}/acai/fauna/searchItem`,
    getItemByUid: `${baseUrl}/acai/fauna/getByID`,
  },
  flora: {
    getItems: `${baseUrl}/acai/flora/getItems`,
    searchItem: `${baseUrl}/acai/flora/searchItem`,
    getItemByUid: `${baseUrl}/acai/flora/getByID`,
  },
  groups: {
    getItems: `${baseUrl}/acai/groups/getItems`,
    searchItem: `${baseUrl}/acai/groups/searchItem`,
    getItemByUid: `${baseUrl}/acai/groups/getByID`,
  },
  people: {
    getItems: `${baseUrl}/acai/people/getItems`,
    searchItem: `${baseUrl}/acai/people/searchItem`,
    getItemByUid: `${baseUrl}/acai/people/getByID`,
  },
  places: {
    getItems: `${baseUrl}/acai/places/getItems`,
    searchItem: `${baseUrl}/acai/places/searchItem`,
    getItemByUid: `${baseUrl}/acai/places/getByID`,
  },
  realia: {
    getItems: `${baseUrl}/acai/realia/getItems`,
    searchItem: `${baseUrl}/acai/realia/searchItem`,
    getItemByUid: `${baseUrl}/acai/realia/getByID`,
  },
};

globalThis.eventApis = eventApis;
globalThis.aquiferApis = aquiferApis;
