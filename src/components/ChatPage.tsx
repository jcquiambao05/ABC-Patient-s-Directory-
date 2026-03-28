import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { api } from '../lib/api';
import type { Message } from '../types/index';

export default function ChatPage({ token }: { token: string }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Hello! I am your ABC Patient Directory assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: 'user', text: input };
    setMessages(m => [...m, userMsg]);
    const cur = input; setInput('');
    try {
      const data = await api('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: cur, history: messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })) })
      }, token);
      setMessages(m => [...m, { role: 'model', text: data.text }]);
    } catch {
      setMessages(m => [...m, { role: 'model', text: 'Sorry, I encountered an error.' }]);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-zinc-50">
      <div className="p-6 border-b border-zinc-200 bg-white">
        <h1 className="text-xl font-bold text-zinc-900">Health Assistant</h1>
        <p className="text-sm text-zinc-500">AI-powered medical assistant</p>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-emerald-500 text-white' : 'bg-white border border-zinc-200 text-zinc-800'}`}>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 bg-white border-t border-zinc-200 flex gap-3">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask about patients or medical records..."
          className="flex-1 px-4 py-2.5 bg-zinc-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm" />
        <button onClick={send} className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors">
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
