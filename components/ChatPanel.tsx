import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, User, Bot, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { DiseaseEntity } from '../types';
import { askGeminiAboutEntity } from '../services/geminiService';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface ChatPanelProps {
    entity: DiseaseEntity;
    onClose?: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ entity, onClose }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const suggestions = [
        "What are the top 3 microscopic findings?",
        "List common differential diagnoses.",
        "Summarize clinical presentation.",
        "What stains are useful here?"
    ];

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleSend = async (text: string = input) => {
        if (!text.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', content: text };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await askGeminiAboutEntity(entity, text);
            const assistantMessage: Message = { role: 'assistant', content: response };
            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "I'm sorry, I encountered an error while processing your request."
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white border-l border-slate-200 shadow-xl overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-indigo-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles size={18} />
                    <h2 className="font-bold text-sm">AI Diagnostic Assistant</h2>
                </div>
                {onClose && (
                    <button onClick={onClose} className="hover:bg-indigo-700 p-1 rounded-full transition-colors">
                        <X size={18} />
                    </button>
                )}
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50"
            >
                {messages.length === 0 && (
                    <div className="text-center py-8">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-w-xs mx-auto mb-6">
                            <Bot className="mx-auto mb-3 text-indigo-500" size={32} />
                            <p className="text-sm text-slate-600 mb-4">
                                Ask me anything about <strong>{entity.entity_name}</strong> based on the available data.
                            </p>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {suggestions.map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSend(s)}
                                        className="text-[10px] bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 px-3 py-1.5 rounded-full border border-slate-200 transition-colors"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-white text-emerald-600 border border-slate-200 shadow-sm'}`}>
                                {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                            </div>
                            <div className={`p-3 rounded-2xl text-sm ${m.role === 'user'
                                ? 'bg-indigo-600 text-white rounded-tr-none'
                                : 'bg-white text-slate-800 border border-slate-200 shadow-sm rounded-tl-none'}`}>
                                <div className="prose prose-sm prose-slate max-w-none">
                                    <ReactMarkdown>{m.content}</ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="max-w-[85%] flex gap-2">
                            <div className="w-8 h-8 rounded-full bg-white text-emerald-600 border border-slate-200 shadow-sm flex items-center justify-center">
                                <Bot size={16} />
                            </div>
                            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl rounded-tl-none p-4 flex items-center gap-2">
                                <Loader2 size={16} className="animate-spin text-indigo-500" />
                                <span className="text-xs text-slate-400 font-medium">Thinking...</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-200 bg-white">
                <form
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="relative"
                >
                    <input
                        type="text"
                        placeholder="Ask a question..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isLoading}
                        className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 top-1.5 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-300 transition-all shadow-sm"
                    >
                        <Send size={18} />
                    </button>
                </form>
                <p className="text-[9px] text-slate-400 mt-2 text-center">
                    AI generated content can be inaccurate. Cross-reference with primary sources.
                </p>
            </div>
        </div>
    );
};

export default ChatPanel;
