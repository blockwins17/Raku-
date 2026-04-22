import React from "react";
import { RakuLight } from "../components/RakuLight";
import { Button } from "../components/ui/button";
import { endpoints } from "../lib/api";
import { useRaku } from "../context/RakuContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
    const { setUser, setIsAuthenticated } = useRaku();
    const navigate = useNavigate();
    const [busy, setBusy] = React.useState(false);

    const signIn = () => {
        // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
        const redirectUrl = window.location.origin + "/";
        window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    };

    const continueAsGuest = async () => {
        if (busy) return;
        setBusy(true);
        try {
            const res = await endpoints.guest();
            setUser(res.user);
            setIsAuthenticated(true);
            navigate("/", { replace: true });
        } catch (e) {
            setBusy(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center px-6 grain relative"
            data-testid="login-page"
        >
            <div className="max-w-md w-full text-center relative z-[1]">
                <div className="flex justify-center mb-10">
                    <RakuLight size="large" data-testid="login-raku-light" />
                </div>
                <h1
                    className="display text-5xl sm:text-6xl leading-[1.05]"
                    data-testid="login-headline"
                >
                    school feels <br /> lighter here.
                </h1>
                <p className="text-white/50 text-sm mt-6 leading-relaxed">
                    one click. one tiny friend.
                    <br />
                    no pressure, just progress.
                </p>
                <div className="mt-10 flex flex-col items-center gap-3">
                    <Button
                        data-testid="login-google-btn"
                        onClick={signIn}
                        className="accent-bg hover:opacity-90 h-11 px-8 rounded-full"
                    >
                        continue with Google
                    </Button>
                    <button
                        data-testid="login-guest-btn"
                        onClick={continueAsGuest}
                        disabled={busy}
                        className="text-xs text-white/40 hover:text-white transition disabled:opacity-50"
                    >
                        {busy ? "letting you in…" : "or peek as a guest →"}
                    </button>
                </div>
                <div className="mt-10 text-[11px] text-white/30 uppercase tracking-[0.2em]">
                    v1 · beta
                </div>
            </div>
        </div>
    );
}
