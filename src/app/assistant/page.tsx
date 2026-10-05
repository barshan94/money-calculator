'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput('');
    setLoading(true);

    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMessage }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', text: `Error: ${data.error}` }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: data.answer }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Network error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Financial Assistant</h1>

      <div className="bg-gray-50 border rounded-lg p-4 h-96 overflow-y-auto space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p className="font-medium">Ask me about your finances</p>
            <p className="text-sm mt-2">Try: &quot;What is my net worth?&quot;, &quot;Show my loans&quot;, &quot;How are my budgets?&quot;</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white rounded-br-none'
                  : 'bg-white border rounded-bl-none'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ask about your finances..."
          disabled={loading}
          autoFocus
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          disabled={loading || !input.trim()}
        >
          {loading ? 'Thinking...' : 'Ask'}
        </button>
      </form>
    </div>
  );
}