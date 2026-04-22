import React, { useEffect, useRef, useState } from "react";
import { endpoints } from "../lib/api";
import { RakuLight } from "../components/RakuLight";
import { Button } from "../components/ui/button";
import { useLocation } from "react-router-dom";

const SUGGESTIONS = [
    "what now?",
    "I don't understand this assignment.",
    "help me plan my essay.",
    "I'm tired.",
];

export default function Chat() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [convId, setConvId] = useState(null);
    const scrollRef = useRef(null);
    const location = useLocation();

    // seed hello
    useEffect(() => {
        setMessages([
            {
                id: "hello",
                role: "assistant",
                text: "hi. I'm Raku. tell me what's on your plate, or just say \"what now?\"",
            },
        ]);
    }, []);

    // prefilled from Today
    useEffect(() => {
        const pre = location.state?.prefill;
        if (pre) {
            setInput(pre);
        }
    }, [location.state]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const send = async (textArg) => {
        const text = (textArg ?? input).trim();
        if (!text || sending) return;
        setInput("");
        const temp = {
            id: `u-${Date.now()}`,
            role: "user",
            text,
        };
        setMessages((m) => [...m, temp]);
        setSending(true);
        try {
            const res = await endpoints.chat(text, convId);
            setConvId(res.conversation_id);
            setMessages((m) => [...m, res.message]);
        } catch (e) {
            setMessages((m) => [
                ...m,
                {
                    id: `e-${Date.now()}`,
                    role: "assistant",
                    text: "my brain hiccuped. try again?",
                },
            ]);
        } finally {
            setSending(false);
        }
    };

    const onKey = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    return (
        <div
            className="p-6 md:p-10 max-w-3xl mx-auto flex flex-col h-[calc(100vh-0px)]"
            data-testid="chat-page"
        >
            <header className="mb-6 flex items-center gap-4">
                <RakuLight size="small" />
                <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-white/40">
                        raku · chat
                    </div>
                    <div className="display text-2xl">what now?</div>
                </div>
            </header>

            <div
                ref={scrollRef}
                data-testid="chat-scroll"
                className="flex-1 overflow-y-auto card-thin p-5 space-y-4 min-h-[300px]"
            >
                {messages.map((m) => (
                    <div
                        key={m.id}
                        data-testid={`msg-${m.role}`}
                        className={`msg-in flex ${
                            m.role === "user" ? "justify-end" : "justify-start"
                        }`}
                    >
                        <div
                            className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                                m.role === "user"
                                    ? "accent-bg"
                                    : "bg-white/5 text-white/90 border border-white/5"
                            }`}
                        >
                            {m.text}
                        </div>
                    </div>
                ))}
                {sending && (
                    <div className="flex justify-start" data-testid="chat-typing">
                        <div className="bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-sm text-white/50">
                            <span className="inline-flex gap-1 align-middle">
                                <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:-0.3s]" />
                                <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:-0.15s]" />
                                <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" />
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <div className="pt-4 flex flex-wrap gap-2" data-testid="chat-suggestions">
                {SUGGESTIONS.map((s) => (
                    <button
                        key={s}
                        data-testid={`suggest-${s.slice(0, 8)}`}
                        onClick={() => send(s)}
                        className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-white/60 hover:border-white/30 hover:text-white transition"
                    >
                        {s}
                    </button>
                ))}
            </div>

            <div className="pt-3 flex items-end gap-2">
                <textarea
                    data-testid="chat-input"
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKey}
                    placeholder="tell Raku what's up…"
                    className="flex-1 resize-none bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm outline-none focus:border-white/30 transition"
                />
                <Button
                    data-testid="chat-send-btn"
                    onClick={() => send()}
                    disabled={sending || !input.trim()}
                    className="accent-bg hover:opacity-90 h-11 px-5"
                >
                    send
                </Button>
            </div>
        </div>
    );
}
