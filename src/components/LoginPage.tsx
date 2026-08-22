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
                padding: "24px",
                boxSizing: "border-box",

                backgroundImage: `
                    linear-gradient(
                        135deg,
                        rgba(15, 23, 42, 0.82),
                        rgba(30, 41, 59, 0.68)
                    ),
                    url("${hotelimage}")
                `,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundAttachment: "fixed",
            }}
        >
            {/* Login Card */}
            <div
                style={{
                    width: "100%",
                    maxWidth: "440px",
                    padding: "42px",
                    boxSizing: "border-box",

                    background: "rgba(255, 255, 255, 0.96)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",

                    border: "1px solid rgba(255, 255, 255, 0.5)",
                    borderRadius: "24px",

                    boxShadow:
                        "0 30px 80px rgba(0, 0, 0, 0.28)",

                    textAlign: "center",
                }}
            >
                {/* Brand Icon */}
                <div
                    style={{
                        width: "68px",
                        height: "68px",
                        margin: "0 auto 22px",

                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",

                        borderRadius: "20px",

                        background:
                            "linear-gradient(135deg, #111827, #374151)",

                        color: "#ffffff",
                        fontSize: "30px",
                        fontWeight: "800",

                        boxShadow:
                            "0 10px 25px rgba(17, 24, 39, 0.25)",
                    }}
                >
                    C
                </div>

                {/* Brand */}
                <div
                    style={{
                        fontSize: "13px",
                        fontWeight: "700",
                        letterSpacing: "2px",
                        color: "#6b7280",
                        textTransform: "uppercase",
                        marginBottom: "10px",
                    }}
                >
                    Cheetah Hotels
                </div>

                {/* Heading */}
                <h1
                    style={{
                        margin: "0",
                        fontSize: "32px",
                        lineHeight: "1.2",
                        fontWeight: "750",
                        color: "#111827",
                    }}
                >
                    Welcome Back
                </h1>

                {/* Subtitle */}
                <p
                    style={{
                        margin: "12px auto 32px",
                        maxWidth: "320px",

                        color: "#6b7280",
                        fontSize: "15px",
                        lineHeight: "1.6",
                    }}
                >
                    Sign in to manage your hotel orders, food menu and
                    dashboard.
                </p>

                {/* Google Button */}
                <button
                    onClick={handleGoogleLogin}
                    style={{
                        width: "100%",
                        height: "54px",

                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: "12px",

                        backgroundColor: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",

                        fontSize: "15px",
                        fontWeight: "600",
                        color: "#1f2937",

                        cursor: "pointer",

                        boxShadow:
                            "0 4px 12px rgba(0, 0, 0, 0.05)",

                        transition:
                            "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform =
                            "translateY(-2px)";
                        e.currentTarget.style.boxShadow =
                            "0 8px 20px rgba(0, 0, 0, 0.10)";
                        e.currentTarget.style.borderColor =
                            "#cbd5e1";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform =
                            "translateY(0)";
                        e.currentTarget.style.boxShadow =
                            "0 4px 12px rgba(0, 0, 0, 0.05)";
                        e.currentTarget.style.borderColor =
                            "#e5e7eb";
                    }}
                >
                    <img
                        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                        alt="Google"
                        style={{
                            width: "21px",
                            height: "21px",
                        }}
                    />

                    Continue with Google
                </button>

                {/* Security */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "7px",

                        marginTop: "24px",

                        color: "#6b7280",
                        fontSize: "12px",
                    }}
                >
                    <span
                        style={{
                            width: "7px",
                            height: "7px",
                            borderRadius: "50%",
                            backgroundColor: "#22c55e",
                            display: "inline-block",
                        }}
                    />

                    Secure authentication powered by Firebase
                </div>

                {/* Divider */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        margin: "25px 0 18px",
                    }}
                >
                    <div
                        style={{
                            flex: 1,
                            height: "1px",
                            backgroundColor: "#e5e7eb",
                        }}
                    />

                    <span
                        style={{
                            color: "#9ca3af",
                            fontSize: "11px",
                            whiteSpace: "nowrap",
                        }}
                    >
                        HOTEL MANAGEMENT SYSTEM
                    </span>

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
                        fontSize: "11px",
                        lineHeight: "1.7",
                    }}
                >
                    By continuing, you agree to our{" "}
                    <span
                        style={{
                            color: "#374151",
                            fontWeight: "600",
                        }}
                    >
                        Terms of Service
                    </span>{" "}
                    and{" "}
                    <span
                        style={{
                            color: "#374151",
                            fontWeight: "600",
                        }}
                    >
                        Privacy Policy
                    </span>
                    .
                </p>
            </div>
        </div>
    );
}

export default LoginPage;