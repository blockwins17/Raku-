import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RakuProvider } from "./context/RakuContext";
import { Sidebar, MobileNav } from "./components/Sidebar";
import Today from "./pages/Today";
import CalendarPage from "./pages/CalendarPage";
import Chat from "./pages/Chat";
import Connections from "./pages/Connections";
import Settings from "./pages/Settings";
import ExtensionPreview from "./pages/ExtensionPreview";
import { Toaster } from "./components/ui/sonner";

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

function App() {
    return (
        <div className="App dark">
            <RakuProvider>
                <BrowserRouter>
                    <Layout>
                        <Routes>
                            <Route path="/" element={<Today />} />
                            <Route path="/calendar" element={<CalendarPage />} />
                            <Route path="/chat" element={<Chat />} />
                            <Route path="/connections" element={<Connections />} />
                            <Route path="/extension" element={<ExtensionPreview />} />
                            <Route path="/settings" element={<Settings />} />
                        </Routes>
                    </Layout>
                </BrowserRouter>
                <Toaster />
            </RakuProvider>
        </div>
    );
}

export default App;
