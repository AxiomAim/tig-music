import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideFirebaseApp, initializeApp, getApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, initializeFirestore } from '@angular/fire/firestore';
import { provideStorage, getStorage } from '@angular/fire/storage';
import { provideFunctions, getFunctions } from '@angular/fire/functions';

import { routes } from './app.routes';
import { firebaseConfig } from './core/firebase.config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    // Shared Tig Music suite identity + data (same `tig-powell` project as the hub).
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth()),
    // ignoreUndefinedProperties: optional fields (a take's note, a release's distributor) are
    // simply omitted instead of making setDoc throw — Firestore rejects `undefined` by default.
    provideFirestore(() => initializeFirestore(getApp(), { ignoreUndefinedProperties: true })),
    provideStorage(() => getStorage()),
    provideFunctions(() => getFunctions()),
  ],
};
