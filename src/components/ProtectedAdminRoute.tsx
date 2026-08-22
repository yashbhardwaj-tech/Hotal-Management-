import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { isAdmin } from "../utils/auth";
import Admin from "./Admin";

function ProtectedAdminRoute() {
    const [loading, setLoading] = useState(true);
    const [admin, setAdmin] = useState(false);
    const [loggedIn, setLoggedIn] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                setLoggedIn(false);
                setAdmin(false);
                setLoading(false);
                return;
            }

            setLoggedIn(true);

            const result = await isAdmin();

            setAdmin(result);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return <div>Checking access...</div>;
    }

    if (!loggedIn) {
        return <Navigate to="/" replace />;
    }

    if (!admin) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Admin />;
}

export default ProtectedAdminRoute;