export const ROUTES = {
  HOME: "/",
  LISTS: "/lists",
  PROFILE: "/profile",
  SETTINGS: "/settings",
  NOTIFICATIONS: "/notifications",
  LOGIN: "/login",
  SIGNUP: "/signup",
  CREATE_EVENT: "/events/create",
  EVENT_DETAIL: "/events/:eventCode",
  EDIT_EVENT: "/events/:eventCode/edit",
  LIST_DETAIL: "/lists/:listId",
  CREATE_LIST: "/lists/create",
  DISCOVER: "/discover",
  TOURNAMENT_DETAIL: "/tournaments/:tournamentId",
  SUBMIT_TOURNAMENT: "/tournaments/submit",
} as const;

// Helper functions to generate routes with parameters
export function getEventRoute(eventCode: string): string {
  return ROUTES.EVENT_DETAIL.replace(":eventCode", eventCode);
}

export function getEditEventRoute(eventCode: string): string {
  return ROUTES.EDIT_EVENT.replace(":eventCode", eventCode);
}

export function getListRoute(listId: string): string {
  return ROUTES.LIST_DETAIL.replace(":listId", listId);
}

export function getTournamentRoute(tournamentId: string): string {
  return ROUTES.TOURNAMENT_DETAIL.replace(":tournamentId", tournamentId);
}
