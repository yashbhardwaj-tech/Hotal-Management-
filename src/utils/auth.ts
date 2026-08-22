import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";

export const isAdmin = async (): Promise<boolean> => {
    const user = auth.currentUser;

    if (!user) {
        return false;
    }

    const adminRef = doc(db, "admins", user.uid);

    const adminSnapshot = await getDoc(adminRef);

    if (!adminSnapshot.exists()) {
        return false;
    }

    const adminData = adminSnapshot.data();

    return adminData.isAdmin === true;
};