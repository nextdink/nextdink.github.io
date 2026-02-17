import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
  type Messaging,
} from "firebase/messaging";

/**
 * Firebase configuration
 * Values are loaded from environment variables (Vite)
 */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/**
 * VAPID key for FCM web push
 * Generate this in Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
 */
export const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * Firebase Cloud Messaging instance
 * Initialized lazily because it's not supported in all browsers
 */
let messagingInstance: Messaging | null = null;

/**
 * Get the Firebase Messaging instance
 * Returns null if messaging is not supported in the current browser
 */
export async function getMessagingInstance(): Promise<Messaging | null> {
  if (messagingInstance) {
    return messagingInstance;
  }

  try {
    const supported = await isSupported();
    if (supported) {
      messagingInstance = getMessaging(app);
      return messagingInstance;
    }
  } catch (error) {
    console.warn("Firebase Messaging not supported:", error);
  }

  return null;
}

/**
 * Register the service worker and get an FCM token
 *
 * @returns The FCM token or null if registration failed
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    // Check if notifications are supported and permitted
    if (!("Notification" in window)) {
      console.warn("Notifications not supported in this browser");
      return null;
    }

    // Request permission if not already granted
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Notification permission denied");
      return null;
    }

    // Get messaging instance
    const messaging = await getMessagingInstance();
    if (!messaging) {
      console.warn("Firebase Messaging not available");
      return null;
    }

    // Register service worker
    const registration = await registerServiceWorker();
    if (!registration) {
      console.warn("Service worker registration failed");
      return null;
    }

    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey: vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log("FCM token obtained successfully");
      return token;
    } else {
      console.warn("No FCM token received");
      return null;
    }
  } catch (error) {
    console.error("Error registering for push notifications:", error);
    return null;
  }
}

/**
 * Register the Firebase messaging service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service workers not supported");
    return null;
  }

  try {
    // Register the Firebase messaging service worker
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
      {
        scope: "/",
      },
    );

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;

    console.log("Service worker registered:", registration.scope);
    return registration;
  } catch (error) {
    console.error("Service worker registration failed:", error);
    return null;
  }
}

/**
 * Set up foreground message handler
 *
 * @param callback Function to call when a message is received in the foreground
 * @returns Unsubscribe function
 */
export async function setupForegroundMessageHandler(
  callback: (payload: {
    notification?: { title?: string; body?: string };
    data?: Record<string, string>;
  }) => void,
): Promise<(() => void) | null> {
  const messaging = await getMessagingInstance();
  if (!messaging) {
    return null;
  }

  return onMessage(messaging, (payload) => {
    console.log("Foreground message received:", payload);
    callback(payload);
  });
}

export default app;
