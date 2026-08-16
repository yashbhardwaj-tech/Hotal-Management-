import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { useNavigate } from "react-router";
import hotelimage from "./../assets/hotel image .jpeg";

function LoginPage() {
    const navigate = useNavigate();

    const handleGoogleLogin = async () => {
        try {
            const provider = new GoogleAuthProvider();

            await signInWithPopup(auth, provider);
            navigate("/dashboard");

        } catch (error) {
            console.error("Login failed:", error);
        }
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "#f5f7fb",
                padding: "20px",
                backgroundImage: `url(${hotelimage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",

            }}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: "420px",
                    backgroundColor: "#ffffff",
                    padding: "45px 40px",
                    borderRadius: "20px",
                    boxShadow: "0 15px 40px rgba(0,0,0,0.08)",
                    textAlign: "center",
                    boxSizing: "border-box",
                }}
            >
                {/* Logo */}
                <div
                    style={{
                        width: "60px",
                        height: "60px",
                        margin: "0 auto 20px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        borderRadius: "16px",
                        backgroundColor: "#111827",
                        color: "#ffffff",
                        fontSize: "28px",
                        fontWeight: "700",
                    }}
                >
                    C
                </div>

                {/* Heading */}
                <h1
                    style={{
                        margin: "0 0 10px",
                        fontSize: "30px",
                        color: "#111827",
                    }}
                >
                    Welcome Back
                </h1>

                <p
                    style={{
                        margin: "0 0 35px",
                        color: "#6b7280",
                        fontSize: "15px",
                    }}
                >
                    Sign in to continue to your account
                </p>

                {/* Google Login */}
                <button
                    onClick={handleGoogleLogin}
                    style={{
                        width: "100%",
                        height: "52px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: "12px",
                        backgroundColor: "#ffffff",
                        border: "1px solid #d1d5db",
                        borderRadius: "10px",
                        fontSize: "15px",
                        fontWeight: "600",
                        color: "#374151",
                        cursor: "pointer",
                    }}
                >
                    <img
                        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                        alt="Google"
                        style={{
                            width: "20px",
                            height: "20px",
                        }}
                    />

                    Continue with Google
                </button>

                {/* Divider */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        margin: "30px 0 20px",
                        color: "#9ca3af",
                        fontSize: "12px",
                    }}
                >
                    <div
                        style={{
                            flex: 1,
                            height: "1px",
                            backgroundColor: "#e5e7eb",
                        }}
                    />

                    Secure authentication

                    <div
                        style={{
                            flex: 1,
                            height: "1px",
                            backgroundColor: "#e5e7eb",
                        }}
                    />
                </div>

                {/* Terms */}
                <p
                    style={{
                        margin: 0,
                        color: "#9ca3af",
                        fontSize: "12px",
                        lineHeight: "1.6",
                    }}
                >
                    By continuing, you agree to our Terms of Service
                    and Privacy Policy.
                </p>
            </div>
        </div>
    );
}

export default LoginPage;