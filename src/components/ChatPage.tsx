import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import type { Message } from '../types/index';

export default function ChatPage({ token }: { token: string }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Hello! I am the ABC Clinic assistant. I can help you with patient records, the queue, procedures, prescriptions, and how to use this system. How can I help?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

  const send = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { role: 'user', text: input };
    setMessages(m => [...m, userMsg]);
    const cur = input;
    setInput('');
    setIsLoading(true);
    try {
      const data = await api('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: cur, history: messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })) })
      }, token);
      setMessages(m => [...m, { role: 'model', text: data.text }]);
    } catch {
      setMessages(m => [...m, { role: 'model', text: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-zinc-100 p-3 md:p-6 overflow-hidden">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm w-full max-w-2xl flex flex-col" style={{ height: 'calc(100vh - 5rem)' }}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex-shrink-0">
          <h1 className="text-base font-bold text-zinc-900">Health Assistant</h1>
          <p className="text-xs text-zinc-400">ABC Clinic Assistant · Powered by Llama 3.2 (local)</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
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
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Thinking...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-zinc-100 flex gap-2 flex-shrink-0">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Ask about patients, queue, procedures, or how to use the app..."
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-zinc-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm disabled:opacity-60 text-zinc-900 placeholder:text-zinc-400" />
          <button onClick={send} disabled={isLoading || !input.trim()}
            className="p-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl transition-colors flex-shrink-0">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
