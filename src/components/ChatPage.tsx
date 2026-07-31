import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, MessageCircle, HelpCircle, ChevronDown, ChevronUp, Sparkles, WifiOff } from 'lucide-react';
import { api } from '../lib/api';
import { FAQ_DATA, type FaqCategory } from '../data/faq';
import type { Message } from '../types/index';

// ── FAQ Accordion ─────────────────────────────────────────────────────────────
function FaqAccordion({ category }: { category: FaqCategory }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="text-base">{category.icon}</span>
        <h3 className="text-sm font-bold text-zinc-700">{category.category}</h3>
      </div>
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden divide-y divide-zinc-100">
        {category.items.map((item, i) => (
          <div key={i}>
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-50 transition-colors gap-3"
            >
              <span className="text-sm font-medium text-zinc-800 flex-1 leading-snug">{item.q}</span>
              {openIndex === i
                ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                : <ChevronDown className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />}
            </button>
            {openIndex === i && (
              <div className="px-4 pb-4 pt-1 bg-emerald-50/50 border-t border-emerald-100">
                <p className="text-sm text-zinc-600 leading-relaxed">{item.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ChatPage ─────────────────────────────────────────────────────────────
export default function ChatPage({ token }: { token: string }) {
  const [tab, setTab] = useState<'chat' | 'faq'>('chat');
  const [aiOnline, setAiOnline] = useState<boolean | null>(null); // null = checking

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Hello! I am the ABC Clinic assistant. I can help you with patient records, the queue, procedures, prescriptions, and how to use this system. How can I help?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // FAQ search state
  const [faqSearch, setFaqSearch] = useState('');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Check if Ollama AI is reachable on mount
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/ai/status', { signal: controller.signal, headers: { Authorization: `Bearer ${token}` } })
      .then(r => setAiOnline(r.ok))
      .catch(() => setAiOnline(false));
    return () => controller.abort();
  }, [token]);

  // Auto-switch to FAQ if AI is offline and user hasn't started chatting
  useEffect(() => {
    if (aiOnline === false && !conversationStarted) {
      setTab('faq');
    }
  }, [aiOnline, conversationStarted]);

  const send = async (messageText?: string) => {
    const text = (messageText || input).trim();
    if (!text || isLoading) return;
    setConversationStarted(true);
    setMessages(m => [...m, { role: 'user', text }]);
    setInput('');
    setIsLoading(true);
    try {
      const data = await api('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          history: messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
        }),
      }, token);
      setMessages(m => [...m, { role: 'model', text: data.text }]);
    } catch {
      setMessages(m => [...m, { role: 'model', text: 'The AI assistant is currently offline. Switch to the FAQ tab for quick answers.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter FAQ by search
  const filteredFaq = faqSearch.trim()
    ? FAQ_DATA.map(cat => ({
        ...cat,
        items: cat.items.filter(
          item =>
            item.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
            item.a.toLowerCase().includes(faqSearch.toLowerCase())
        ),
      })).filter(cat => cat.items.length > 0)
    : FAQ_DATA;

  return (
    <div className="flex-1 flex items-center justify-center bg-zinc-100 p-3 md:p-6 overflow-hidden">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm w-full max-w-2xl flex flex-col" style={{ height: 'calc(100vh - 5rem)' }}>

        {/* ── Header ── */}
        <div className="px-5 py-3 border-b border-zinc-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-base font-bold text-zinc-900">Assistant</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                {aiOnline === null && (
                  <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" /> Checking AI status...
                  </span>
                )}
                {aiOnline === true && (
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> AI · Online · Local
                  </span>
                )}
                {aiOnline === false && (
                  <span className="text-[10px] text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <WifiOff className="w-2.5 h-2.5" /> AI Offline — FAQ available below
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-zinc-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => setTab('chat')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                tab === 'chat' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" /> AI Chat
            </button>
            <button
              onClick={() => setTab('faq')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                tab === 'faq' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" /> FAQ / Help
            </button>
          </div>
        </div>

        {/* ── Chat Tab ── */}
        {tab === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {/* Offline banner inside chat */}
              {aiOnline === false && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
                  <WifiOff className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-800">AI assistant is offline</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Ollama is not running on this computer. You can still type questions below — switch to the
                      <button onClick={() => setTab('faq')} className="underline font-medium mx-1">FAQ tab</button>
                      for instant offline answers.
                    </p>
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-emerald-500 text-white rounded-br-sm'
                      : 'bg-zinc-100 border border-zinc-200 text-zinc-800 rounded-bl-sm'
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-100 border border-zinc-200 px-4 py-2.5 rounded-2xl rounded-bl-sm flex items-center gap-2 text-zinc-500 text-sm">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking...
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick FAQ bubbles — before conversation starts */}
            {!conversationStarted && aiOnline === true && (
              <div className="px-4 pb-2 space-y-1.5 flex-shrink-0">
                <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider px-1">Quick questions</p>
                {[
                  'How do I add a patient to the queue?',
                  'What does the verified badge mean?',
                  'How do I schedule a follow-up appointment?',
                ].map(q => (
                  <button key={q} onClick={() => send(q)} disabled={isLoading}
                    className="w-full text-left px-4 py-2.5 bg-zinc-50 hover:bg-emerald-50 border border-zinc-200 hover:border-emerald-300 rounded-xl text-sm text-zinc-700 hover:text-emerald-700 transition-colors flex items-center gap-2.5 disabled:opacity-50">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-4 py-3 border-t border-zinc-100 flex gap-2 flex-shrink-0">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Ask about patients, queue, procedures, or how to use the app..."
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 bg-zinc-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm disabled:opacity-60 text-zinc-900 placeholder:text-zinc-400"
              />
              <button
                onClick={() => send()}
                disabled={isLoading || !input.trim()}
                className="p-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl transition-colors flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* ── FAQ Tab ── */}
        {tab === 'faq' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search */}
            <div className="px-4 py-3 border-b border-zinc-100 flex-shrink-0">
              <input
                type="text"
                value={faqSearch}
                onChange={e => setFaqSearch(e.target.value)}
                placeholder="Search questions..."
                className="w-full px-4 py-2.5 bg-zinc-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm text-zinc-900 placeholder:text-zinc-400"
              />
            </div>

            {/* FAQ list */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {filteredFaq.length === 0 ? (
                <div className="text-center py-12 text-zinc-400">
                  <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No results for "{faqSearch}"</p>
                  <button onClick={() => setFaqSearch('')} className="mt-2 text-xs text-emerald-600 font-medium">
                    Clear search
                  </button>
                </div>
              ) : (
                filteredFaq.map(cat => <FaqAccordion key={cat.category} category={cat} />)
              )}

              {/* Footer note */}
              <div className="mt-4 pb-4 text-center">
                <p className="text-[11px] text-zinc-400">
                  Can't find your answer?{' '}
                  <button onClick={() => setTab('chat')} className="text-emerald-600 font-medium hover:underline">
                    Ask the AI assistant
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
