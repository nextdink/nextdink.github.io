# Push Notifications Setup Guide

This guide covers the complete setup for push notifications in Next Dink, including iOS support.

## Overview

Next Dink uses Firebase Cloud Messaging (FCM) for push notifications. The system consists of:

1. **PWA Manifest & Icons** - Required for installation on devices
2. **Service Worker** - Handles background notifications
3. **Frontend Components** - Permission UI and notification handling
4. **Cloud Functions** - Server-side notification triggers

## Prerequisites

- Firebase project with Firestore enabled
- Firebase CLI installed (`npm install -g firebase-tools`)
- Firebase Blaze (pay-as-you-go) plan for Cloud Functions

## Setup Steps

### 1. Configure Firebase Web Push

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Project Settings** → **Cloud Messaging** tab
4. Under "Web Push certificates", click **Generate key pair**
5. Copy the generated VAPID key

### 2. Add Environment Variables

Add the VAPID key to your `.env` file:

```env
# Existing Firebase config
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# Add this new key
VITE_FIREBASE_VAPID_KEY=your-vapid-key-from-firebase-console
```

### 3. Update Service Worker Configuration

The service worker (`public/firebase-messaging-sw.js`) needs your Firebase config.

**Option A: Hardcode values (simpler)**

Edit `public/firebase-messaging-sw.js` and replace the config object with your actual values:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
};
```

**Option B: Build-time injection (more secure)**

Create a build script that injects environment variables into the service worker during build.

### 4. Deploy Cloud Functions

```bash
# Navigate to functions directory
cd functions

# Install dependencies
npm install

# Login to Firebase
firebase login

# Initialize Firebase in your project (if not already done)
firebase init functions
# Select your project, use TypeScript, and DON'T overwrite existing files

# Deploy functions
npm run deploy
```

### 5. Update Firestore Security Rules

Add these rules to allow notification token management:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;

      // Allow updating fcmTokens array
      allow update: if request.auth.uid == userId
        && request.resource.data.diff(resource.data).affectedKeys()
           .hasOnly(['fcmTokens', 'notificationSettings', 'updatedAt']);
    }
  }
}
```

## iOS Setup (Critical!)

iOS has special requirements for push notifications:

### iOS Requirements

1. **Must be installed as PWA** - Users must add the app to their home screen
2. **iOS 16.4+** - Web Push is only supported on iOS 16.4 and later
3. **HTTPS required** - Already provided by GitHub Pages
4. **Must be opened from home screen** - Notifications don't work in Safari browser

### Guiding iOS Users

The app includes components to guide iOS users:

- `InstallBanner` - Shows on iOS devices not running as PWA
- `IOSInstallGuide` - Step-by-step installation instructions modal
- `NotificationPermissionCard` - Detects iOS and shows appropriate guidance

These components automatically detect iOS and show the appropriate UI.

## Testing

### Test Locally

1. Run the development server:

   ```bash
   npm run dev
   ```

2. Open Chrome DevTools → Application → Service Workers
3. Verify the service worker is registered
4. Test notification permission

### Test Push Notifications

1. Enable notifications in the app
2. Create a test event and invite yourself
3. Check if notification is received

### Debug in Firebase Console

Go to Firebase Console → Functions → Logs to see notification function execution logs.

## Notification Triggers

The following events trigger notifications:

| Trigger            | Recipients                      | Preference Key      |
| ------------------ | ------------------------------- | ------------------- |
| Event Invite       | Invited user                    | `eventInvites`      |
| Slot Claimed       | Team captain                    | `slotClaimed`       |
| Waitlist Promotion | Promoted team captain           | `waitlistPromotion` |
| Event Canceled     | All participants                | `eventCanceled`     |
| Event Updated      | All participants (except owner) | `eventUpdated`      |

## Troubleshooting

### Notifications not appearing

1. Check browser notification permissions
2. Verify service worker is registered (DevTools → Application)
3. Check FCM token is saved to user document
4. Review Cloud Function logs

### iOS notifications not working

1. Verify iOS version is 16.4+
2. Ensure app is installed to home screen
3. App must be opened from home screen icon (not Safari)
4. User must grant permission from within the installed app

### Service worker not updating

Clear service worker and cache:

1. DevTools → Application → Service Workers → Unregister
2. DevTools → Application → Clear Storage → Clear site data
3. Refresh the page

### FCM token errors

Check for expired/invalid tokens in Cloud Function logs. The system automatically cleans up invalid tokens.

## Architecture

```
User Action → Firestore Write → Cloud Function Trigger
                                       ↓
                              Check User Preferences
                                       ↓
                              Get User's FCM Tokens
                                       ↓
                              Send via FCM Admin SDK
                                       ↓
                              Service Worker Receives
                                       ↓
                              Show Notification
```

## Cost Considerations

Firebase Cloud Functions pricing (Blaze plan):

- **Free tier**: 2M invocations/month
- **After free tier**: $0.40 per million invocations

For a typical pickleball app with <1000 users:

- Expected cost: $0-5/month (usually free tier)

## Files Reference

| File                                                   | Purpose                                     |
| ------------------------------------------------------ | ------------------------------------------- |
| `public/manifest.json`                                 | PWA manifest with icons                     |
| `public/firebase-messaging-sw.js`                      | Service worker for background notifications |
| `public/icons/`                                        | PWA icons                                   |
| `src/config/firebase.ts`                               | Firebase messaging setup                    |
| `src/services/notificationService.ts`                  | Token management                            |
| `src/hooks/useNotifications.ts`                        | Notification hook                           |
| `src/hooks/useInstallPrompt.ts`                        | PWA install detection                       |
| `src/components/common/InstallBanner.tsx`              | Install prompt UI                           |
| `src/components/common/IOSInstallGuide.tsx`            | iOS instructions                            |
| `src/components/common/NotificationPermissionCard.tsx` | Permission UI                               |
| `functions/src/index.ts`                               | Cloud Functions                             |
