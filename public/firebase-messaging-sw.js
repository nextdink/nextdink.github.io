/**
 * Firebase Cloud Messaging Service Worker
 * 
 * This service worker handles push notifications in the background.
 * It runs separately from the main app and can receive messages even when
 * the app is closed or in the background.
 * 
 * IMPORTANT: This file must be at the root of the public directory
 * (served at /firebase-messaging-sw.js) for Firebase to register it correctly.
 */

// Import Firebase scripts (using compat version for service worker)
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

/**
 * Firebase configuration
 * Note: These values are safe to expose in client-side code.
 * The security comes from Firebase Security Rules, not from hiding these keys.
 * 
 * These will be replaced during build or should match your .env values.
 * For production, consider using a build script to inject these values.
 */
const firebaseConfig = {
  apiKey: '__FIREBASE_API_KEY__',
  authDomain: '__FIREBASE_AUTH_DOMAIN__',
  projectId: '__FIREBASE_PROJECT_ID__',
  storageBucket: '__FIREBASE_STORAGE_BUCKET__',
  messagingSenderId: '__FIREBASE_MESSAGING_SENDER_ID__',
  appId: '__FIREBASE_APP_ID__',
};

// Initialize Firebase only if config is available
let messaging = null;

try {
  // Check if we have valid config (at least projectId)
  if (firebaseConfig.projectId || firebaseConfig.messagingSenderId) {
    firebase.initializeApp(firebaseConfig);
    messaging = firebase.messaging();
    console.log('[firebase-messaging-sw] Firebase initialized successfully');
  } else {
    console.warn('[firebase-messaging-sw] Firebase config not available, push notifications disabled');
  }
} catch (error) {
  console.error('[firebase-messaging-sw] Error initializing Firebase:', error);
}

/**
 * Handle background messages
 * This is called when a push message is received while the app is in the background
 * or closed. Foreground messages are handled by the app itself.
 */
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw] Received background message:', payload);

    // Extract notification data
    const notificationTitle = payload.notification?.title || 'Next Dink';
    const notificationOptions = {
      body: payload.notification?.body || 'You have a new notification',
      icon: payload.notification?.icon || '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag: payload.data?.tag || 'default',
      data: payload.data || {},
      // Actions for notification buttons
      actions: getNotificationActions(payload.data?.type),
      // Vibration pattern
      vibrate: [100, 50, 100],
      // Require interaction (notification won't auto-dismiss)
      requireInteraction: shouldRequireInteraction(payload.data?.type),
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

/**
 * Get appropriate actions based on notification type
 */
function getNotificationActions(type) {
  switch (type) {
    case 'event_invite':
      return [
        { action: 'view', title: 'View Event' },
        { action: 'dismiss', title: 'Dismiss' },
      ];
    case 'slot_claimed':
      return [
        { action: 'view', title: 'View Team' },
      ];
    case 'waitlist_promotion':
      return [
        { action: 'view', title: 'View Event' },
      ];
    case 'event_canceled':
      return [
        { action: 'view', title: 'View Details' },
      ];
    case 'event_updated':
      return [
        { action: 'view', title: 'View Changes' },
      ];
    default:
      return [
        { action: 'view', title: 'View' },
      ];
  }
}

/**
 * Determine if notification should require user interaction
 */
function shouldRequireInteraction(type) {
  // Important notifications that shouldn't auto-dismiss
  const importantTypes = ['event_invite', 'waitlist_promotion', 'event_canceled'];
  return importantTypes.includes(type);
}

/**
 * Handle notification click
 * This is called when the user clicks on a notification
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw] Notification clicked:', event);
  
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  // Determine the URL to open
  let urlToOpen = '/';
  
  if (action === 'dismiss') {
    return; // Just close the notification
  }

  // Route based on notification type
  if (data.eventId) {
    urlToOpen = `/event/${data.eventCode || data.eventId}`;
  } else if (data.type === 'event_invite' && data.eventCode) {
    urlToOpen = `/event/${data.eventCode}`;
  }

  // Focus existing window or open new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window/tab open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          // Navigate to the specific URL
          if (client.navigate) {
            return client.navigate(urlToOpen);
          }
          return client;
        }
      }
      // Open new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

/**
 * Handle notification close (for analytics)
 */
self.addEventListener('notificationclose', (event) => {
  console.log('[firebase-messaging-sw] Notification closed:', event.notification.tag);
  // Could send analytics here
});

/**
 * Service Worker install event
 */
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw] Service worker installing...');
  // Skip waiting to activate immediately
  self.skipWaiting();
});

/**
 * Service Worker activate event
 */
self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw] Service worker activating...');
  // Claim all clients immediately
  event.waitUntil(clients.claim());
});

/**
 * Handle push event directly (fallback if FCM doesn't process)
 */
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw] Push event received');
  
  if (!event.data) {
    console.log('[firebase-messaging-sw] No data in push event');
    return;
  }

  try {
    const payload = event.data.json();
    console.log('[firebase-messaging-sw] Push payload:', payload);
    
    // If FCM didn't handle it, show notification manually
    if (!payload.notification) {
      const title = payload.data?.title || 'Next Dink';
      const options = {
        body: payload.data?.body || 'You have a new notification',
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        data: payload.data,
      };
      
      event.waitUntil(
        self.registration.showNotification(title, options)
      );
    }
  } catch (error) {
    console.error('[firebase-messaging-sw] Error processing push event:', error);
  }
});