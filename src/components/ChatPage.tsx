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
    <div className="flex-1 flex flex-col bg-zinc-50">
      <div className="p-6 border-b border-zinc-200 bg-white">
        <h1 className="text-xl font-bold text-zinc-900">Health Assistant</h1>
        <p className="text-sm text-zinc-500">ABC Clinic Assistant · Powered by Llama 3.2 (local)</p>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-emerald-500 text-white' : 'bg-zinc-100 border border-zinc-200 text-zinc-800'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-zinc-100 border border-zinc-200 px-4 py-3 rounded-2xl flex items-center gap-2 text-zinc-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 bg-white border-t border-zinc-200 flex gap-3">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Ask about patients, queue, procedures, or how to use the app..."
          disabled={isLoading}
          className="flex-1 px-4 py-2.5 bg-zinc-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm disabled:opacity-60" />
        <button onClick={send} disabled={isLoading || !input.trim()}
          className="p-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl transition-colors">
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
