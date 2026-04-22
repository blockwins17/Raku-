import React from "react";
import { NavLink } from "react-router-dom";
import { RakuLight } from "./RakuLight";

const ITEMS = [
    { to: "/", label: "Today", end: true },
    { to: "/calendar", label: "Calendar" },
    { to: "/chat", label: "Chat" },
    { to: "/connections", label: "Connections" },
    { to: "/extension", label: "Extension" },
    { to: "/settings", label: "Settings" },
];

export const Sidebar = () => (
    <aside
        data-testid="raku-sidebar"
        className="hidden md:flex md:flex-col w-56 shrink-0 border-r border-white/5 bg-black/40 p-6 gap-8 min-h-screen sticky top-0"
    >
        <div className="flex items-center gap-3">
            <RakuLight size="tiny" data-testid="sidebar-raku-light" />
            <div>
                <div className="display text-xl leading-none">raku</div>
                <div className="text-[11px] text-white/40 mt-1">
                    school feels lighter
                </div>
            </div>
        </div>

        <nav className="flex flex-col gap-1">
            {ITEMS.map((it) => (
                <NavLink
                    key={it.to}
                    to={it.to}
                    end={it.end}
                    data-testid={`nav-${it.label.toLowerCase()}`}
                    className={({ isActive }) =>
                        `px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive
                                ? "bg-white/5 text-white"
                                : "text-white/50 hover:text-white hover:bg-white/[0.03]"
                        }`
                    }
                >
                    {it.label}
                </NavLink>
            ))}
        </nav>

        <div className="mt-auto text-[11px] text-white/30 leading-relaxed">
            v1 · beta
            <br />
            no pressure, just progress.
        </div>
    </aside>
);

export const MobileNav = () => (
    <nav
        data-testid="mobile-nav"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-white/5 bg-black/80 backdrop-blur flex justify-around py-2"
    >
        {ITEMS.map((it) => (
            <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                data-testid={`mnav-${it.label.toLowerCase()}`}
                className={({ isActive }) =>
                    `text-[11px] px-2 py-1 rounded ${
                        isActive ? "text-white" : "text-white/40"
                    }`
                }
            >
                {it.label}
            </NavLink>
        ))}
    </nav>
);

export default Sidebar;
