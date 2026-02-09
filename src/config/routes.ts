export const ROUTES = {
  HOME: '/',
  LISTS: '/lists',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  NOTIFICATIONS: '/notifications',
  LOGIN: '/login',
  SIGNUP: '/signup',
  CREATE_EVENT: '/events/create',
  EVENT_DETAIL: '/events/:eventCode',
  EDIT_EVENT: '/events/:eventCode/edit',
  LIST_DETAIL: '/lists/:listId',
  CREATE_LIST: '/lists/create',
} as const;

// Helper functions to generate routes with parameters
export function getEventRoute(eventCode: string): string {
  return ROUTES.EVENT_DETAIL.replace(':eventCode', eventCode);
}

export function getEditEventRoute(eventCode: string): string {
  return ROUTES.EDIT_EVENT.replace(':eventCode', eventCode);
}

export function getListRoute(listId: string): string {
  return ROUTES.LIST_DETAIL.replace(':listId', listId);
}
