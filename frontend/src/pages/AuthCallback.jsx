import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { endpoints } from "../lib/api";
import { useRaku } from "../context/RakuContext";
import { RakuLight } from "../components/RakuLight";

export default function AuthCallback() {
    const navigate = useNavigate();
    const { setUser, setIsAuthenticated } = useRaku();
    const hasProcessed = useRef(false);

    useEffect(() => {
        if (hasProcessed.current) return;
        hasProcessed.current = true;

        const hash = window.location.hash || "";
        const match = hash.match(/session_id=([^&]+)/);
        if (!match) {
            navigate("/login", { replace: true });
            return;
        }
        const session_id = decodeURIComponent(match[1]);

        (async () => {
            try {
                const res = await endpoints.session(session_id);
                setUser(res.user);
                setIsAuthenticated(true);
                // clear the hash + redirect to dashboard
                window.history.replaceState(null, "", "/");
                navigate("/", { replace: true, state: { user: res.user } });
            } catch (e) {
                navigate("/login", { replace: true });
            }
        })();
    }, [navigate, setUser, setIsAuthenticated]);

    return (
        <div
            className="min-h-screen flex items-center justify-center"
            data-testid="auth-callback"
        >
            <RakuLight size="large" />
        </div>
    );
}
