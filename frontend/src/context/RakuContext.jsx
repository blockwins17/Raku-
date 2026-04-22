import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { endpoints } from "../lib/api";

const RakuContext = createContext(null);

export const RakuProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    // null = checking, true = authed, false = not authed
    const [isAuthenticated, setIsAuthenticated] = useState(null);

    const applyAccent = (hex) => {
        if (!hex) return;
        const r = document.documentElement;
        r.style.setProperty("--raku-accent", hex);
        r.style.setProperty("--raku-accent-soft", hexToRgba(hex, 0.18));
        r.style.setProperty("--raku-accent-strong", hexToRgba(hex, 0.9));
    };

    const checkAuth = useCallback(async () => {
        try {
            const u = await endpoints.me();
            setUser(u);
            applyAccent(u?.accent_color);
            setIsAuthenticated(true);
            return u;
        } catch (_e) {
            setUser(null);
            setIsAuthenticated(false);
            return null;
        }
    }, []);

    useEffect(() => {
        // CRITICAL: if returning from OAuth callback, skip the /me check —
        // AuthCallback will handle it first.
        if (window.location.hash?.includes("session_id=")) {
            return;
        }
        checkAuth();
    }, [checkAuth]);

    const updateUser = async (patch) => {
        const u = await endpoints.patchMe(patch);
        setUser(u);
        applyAccent(u?.accent_color);
        return u;
    };

    const logout = async () => {
        try {
            await endpoints.logout();
        } catch (_) {}
        setUser(null);
        setIsAuthenticated(false);
        window.location.href = "/login";
    };

    return (
        <RakuContext.Provider
            value={{ user, isAuthenticated, checkAuth, setUser, updateUser, logout, setIsAuthenticated }}
        >
            {children}
        </RakuContext.Provider>
    );
};

export const useRaku = () => {
    const ctx = useContext(RakuContext);
    if (!ctx) throw new Error("useRaku must be inside RakuProvider");
    return ctx;
};

function hexToRgba(hex, a = 1) {
    const clean = hex.replace("#", "");
    const n = parseInt(
        clean.length === 3
            ? clean.split("").map((c) => c + c).join("")
            : clean,
        16
    );
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
