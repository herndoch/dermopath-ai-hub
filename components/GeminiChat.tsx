import React, { useState } from 'react';
import { DiseaseEntity } from '../types';
import { askGeminiAboutEntity } from '../services/geminiService';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface GeminiChatProps {
  entity: DiseaseEntity;
}

interface Message {
  role: 'user' | 'ai';
  text: string;
}

const GeminiChat: React.FC<GeminiChatProps> = ({ entity }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: `Hi! I can answer questions about **${entity.entity_name}** based on the pathology data.` }
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMsg = query;
    setQuery('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    const answer = await askGeminiAboutEntity(entity, userMsg);
    
    setMessages(prev => [...prev, { role: 'ai', text: answer }]);
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-xl border border-indigo-100 shadow-sm flex flex-col h-[400px] md:h-[calc(100vh-250px)]">
      <div className="p-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-t-xl flex items-center gap-2">
        <Bot size={18} />
        <span className="font-medium text-sm">Pathology Assistant</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'ai' && (
              <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <Bot size={14} className="text-indigo-600" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-br-none' 
                : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'
            }`}>
              <ReactMarkdown>{msg.text}</ReactMarkdown>
            </div>
            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                <User size={14} className="text-slate-600" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 justify-start">
             <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                <Bot size={14} className="text-indigo-600" />
              </div>
              <div className="bg-white border border-slate-200 px-4 py-2 rounded-2xl rounded-bl-none shadow-sm">
                <Loader2 size={16} className="animate-spin text-indigo-600" />
              </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-2 border-t border-slate-200 bg-white rounded-b-xl">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about this diagnosis..."
            className="flex-1 text-sm border-slate-200 bg-slate-50 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 px-3 py-2"
          />
          <button 
            type="submit" 
            disabled={loading || !query.trim()}
            className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default GeminiChat;