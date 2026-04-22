import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { endpoints } from "../lib/api";

const RakuContext = createContext(null);

export const RakuProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        const u = await endpoints.me();
        setUser(u);
        applyAccent(u?.accent_color);
        return u;
    }, []);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const u = await endpoints.me();
                if (mounted) {
                    setUser(u);
                    applyAccent(u?.accent_color);
                }
            } catch (e) {
                console.error("failed to load user", e);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    const updateUser = async (patch) => {
        const u = await endpoints.patchMe(patch);
        setUser(u);
        applyAccent(u?.accent_color);
        return u;
    };

    return (
        <RakuContext.Provider value={{ user, loading, refreshUser, updateUser }}>
            {children}
        </RakuContext.Provider>
    );
};

export const useRaku = () => {
    const ctx = useContext(RakuContext);
    if (!ctx) throw new Error("useRaku must be inside RakuProvider");
    return ctx;
};

function applyAccent(hex) {
    if (!hex) return;
    const root = document.documentElement;
    root.style.setProperty("--raku-accent", hex);
    root.style.setProperty("--raku-accent-soft", hexToRgba(hex, 0.18));
    root.style.setProperty("--raku-accent-strong", hexToRgba(hex, 0.9));
}

function hexToRgba(hex, a = 1) {
    const clean = hex.replace("#", "");
    const bigint = parseInt(
        clean.length === 3
            ? clean
                  .split("")
                  .map((c) => c + c)
                  .join("")
            : clean,
        16
    );
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}
