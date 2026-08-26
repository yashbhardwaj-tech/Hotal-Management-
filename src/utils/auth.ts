// utils/auth.ts

import {
  GoogleAuthProvider,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';

const GUEST_ID_KEY = 'hk_guest_id';
const GUEST_DETAILS_KEY = 'hk_guest_details';

/* =========================================================
   GUEST IDENTITY
   The dashboard is open to everyone, so an order still needs
   something to hang off. A random id in localStorage lets a
   guest see their own orders without ever signing in.
========================================================= */

export const getGuestId = (): string => {
  let id = localStorage.getItem(GUEST_ID_KEY);

  if (!id) {
    id = `guest_${crypto.randomUUID()}`;
    localStorage.setItem(GUEST_ID_KEY, id);
  }

  return id;
};

/** The id an order should be filed under. */
export const getOrderOwnerId = (user: User | null): string =>
  user?.uid ?? getGuestId();

/* =========================================================
   SAVED DELIVERY DETAILS
   Prefills the checkout form on repeat orders.
========================================================= */

export interface DeliveryDetails {
  name: string;
  phone: string;
  address: string;
  landmark: string;
}

export const loadDeliveryDetails = (): DeliveryDetails | null => {
  try {
    const raw = localStorage.getItem(GUEST_DETAILS_KEY);
    return raw ? (JSON.parse(raw) as DeliveryDetails) : null;
  } catch {
    return null;
  }
};

export const saveDeliveryDetails = (details: DeliveryDetails): void => {
  try {
    localStorage.setItem(GUEST_DETAILS_KEY, JSON.stringify(details));
  } catch {
    /* Private mode or quota — not worth failing the order over */
  }
};

/* =========================================================
   GOOGLE SIGN-IN
========================================================= */

export const signInWithGoogle = async (): Promise<User> => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const credential = await signInWithPopup(auth, provider);

  await ensureUserDocument(credential.user);

  return credential.user;
};

/* =========================================================
   USER DOCUMENT
   Created once, on first sign-in, with isAdmin: false. You
   then flip that flag by hand in the Firestore console to
   grant someone admin access.

   Note the getDoc guard: a blind setDoc with merge would
   still rewrite isAdmin to false on every sign-in, silently
   demoting the admins you just promoted.
========================================================= */

export const ensureUserDocument = async (user: User): Promise<void> => {
  const ref = doc(db, 'users', user.uid);

  try {
    const snapshot = await getDoc(ref);

    if (snapshot.exists()) {
      /* Refresh the profile fields only — never isAdmin */
      await setDoc(
        ref,
        {
          name: user.displayName ?? '',
          email: user.email ?? '',
          photoURL: user.photoURL ?? '',
          lastSeenAt: serverTimestamp(),
        },
        { merge: true },
      );
      return;
    }

    await setDoc(ref, {
      uid: user.uid,
      name: user.displayName ?? '',
      email: user.email ?? '',
      photoURL: user.photoURL ?? '',
      isAdmin: false,
      createdAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Could not write user document:', error);
  }
};

/* =========================================================
   ADMIN CHECK
========================================================= */

export const isAdmin = async (user?: User | null): Promise<boolean> => {
  const current = user ?? auth.currentUser;

  if (!current) return false;

  try {
    const snapshot = await getDoc(doc(db, 'users', current.uid));
    return snapshot.exists() && snapshot.data().isAdmin === true;
  } catch (error) {
    console.error('Admin check failed:', error);
    return false;
  }
};