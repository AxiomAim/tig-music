// Firebase web config for Tig Music — in the shared `tig-powell` project, so sign-in
// produces the same uid as the hub and the other tig apps and writes into the shared
// user tree. These values are public (they ship in the client bundle); access is
// controlled by Firebase Security Rules.
//
// NOTE: `apiKey` is project-scoped (shared) and works as-is for auth/Firestore. Before
// launch, register a dedicated "tig-music" Web App in the Firebase console and swap in
// its own `appId` (and `measurementId`) so analytics attribute to Tig Music.
export const firebaseConfig = {
  apiKey: 'AIzaSyAY0pFHgZ4RyS_XZjhWkoZ7B0DAnVXYJ54',
  authDomain: 'tig-powell.firebaseapp.com',
  projectId: 'tig-powell',
  storageBucket: 'tig-powell.firebasestorage.app',
  messagingSenderId: '770605642153',
  appId: '1:770605642153:web:05365d90b332f258c214b8',
  measurementId: 'G-66DSRWC4VX',
};
