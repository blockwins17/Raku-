import React from "react";
import "@/App.css";
import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
    useLocation,
} from "react-router-dom";
import { RakuProvider, useRaku } from "./context/RakuContext";
import { Sidebar, MobileNav } from "./components/Sidebar";
import Today from "./pages/Today";
import CalendarPage from "./pages/CalendarPage";
import Chat from "./pages/Chat";
import Connections from "./pages/Connections";
import Settings from "./pages/Settings";
import ExtensionPreview from "./pages/ExtensionPreview";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import { Toaster } from "./components/ui/sonner";
import { RakuLight } from "./components/RakuLight";

function Protected({ children }) {
    const { isAuthenticated } = useRaku();
    if (isAuthenticated === null) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                data-testid="auth-checking"
            >
                <RakuLight />
            </div>
        );
    }
    if (isAuthenticated === false) {
        return <Navigate to="/login" replace />;
    }
    return children;
}

function Layout({ children }) {
    return (
        <div className="min-h-screen flex relative grain">
            <Sidebar />
            <main className="flex-1 min-w-0 pb-16 md:pb-0 relative z-[1]">
                {children}
            </main>
            <MobileNav />
        </div>
    );
}

function Router() {
    const location = useLocation();
    // Synchronously catch the OAuth callback hash BEFORE any /me check runs
    if (location.hash?.includes("session_id=")) {
        return <AuthCallback />;
    }
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route
                path="/"
                element={
                    <Protected>
                        <Layout>
                            <Today />
                        </Layout>
                    </Protected>
                }
            />
            <Route
                path="/calendar"
                element={
                    <Protected>
                        <Layout>
                            <CalendarPage />
                        </Layout>
                    </Protected>
                }
            />
            <Route
                path="/chat"
                element={
                    <Protected>
                        <Layout>
                            <Chat />
                        </Layout>
                    </Protected>
                }
            />
            <Route
                path="/connections"
                element={
                    <Protected>
                        <Layout>
                            <Connections />
                        </Layout>
                    </Protected>
                }
            />
            <Route
                path="/extension"
                element={
                    <Protected>
                        <Layout>
                            <ExtensionPreview />
                        </Layout>
                    </Protected>
                }
            />
            <Route
                path="/settings"
                element={
                    <Protected>
                        <Layout>
                            <Settings />
                        </Layout>
                    </Protected>
                }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

function App() {
    return (
        <div className="App dark">
            <RakuProvider>
                <BrowserRouter>
                    <Router />
                </BrowserRouter>
                <Toaster />
            </RakuProvider>
        </div>
    );
}

export default App;
