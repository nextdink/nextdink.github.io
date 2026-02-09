export const ROUTES = {
  HOME: '/',
  DISCOVER: '/discover',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  NOTIFICATIONS: '/notifications',
  LOGIN: '/login',
  SIGNUP: '/signup',
  CREATE_EVENT: '/events/create',
  EVENT_DETAIL: '/events/:eventId',
  EDIT_EVENT: '/events/:eventId/edit',
  LIST_DETAIL: '/lists/:listId',
  CREATE_LIST: '/lists/create',
} as const;

// Helper functions to generate routes with parameters
export function getEventRoute(eventId: string): string {
  return ROUTES.EVENT_DETAIL.replace(':eventId', eventId);
}

export function getEditEventRoute(eventId: string): string {
  return ROUTES.EDIT_EVENT.replace(':eventId', eventId);
}

export function getListRoute(listId: string): string {
  return ROUTES.LIST_DETAIL.replace(':listId', listId);
}
