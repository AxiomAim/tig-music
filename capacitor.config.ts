/// <reference types="node" />
// Capacitor config for the Tig Music mobile shells (iOS/Android) — US-8.2.
// The native app wraps the same web build; native code is limited to capture/permissions.
//
// To build the shells (adds ~/ios and ~/android, not committed until you run these):
//   npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
//   npm run build                       # produces dist/tig-music/browser
//   npx cap add ios && npx cap add android
//   npx cap sync                         # copy the web build into the shells
//
// `server.url` (optional) can point at music.tigpowell.com for a live-reload/thin shell;
// leave it unset to bundle the built assets from `webDir`.
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tigpowell.music',
  appName: 'Tig Music',
  webDir: 'dist/tig-music/browser',
  ios: { contentInset: 'always' },
  plugins: {
    // The recording feature needs the microphone; declare usage strings in the native
    // projects (Info.plist NSMicrophoneUsageDescription / AndroidManifest RECORD_AUDIO).
  },
};

export default config;
