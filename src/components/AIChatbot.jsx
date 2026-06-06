import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Loader2, Bot, User, MinusCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGemini } from '../hooks/useGemini';
import { supabase } from '../services/supabase';

export const AIChatbot = ({ courseContext = null }) => {
  const { user } = useAuth();
  const { generateChatReply, hasGeminiConfig } = useGemini();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi ${user?.name?.split(' ')[0] || 'there'}! 👋 I'm your Learn Guru AI assistant. Ask me anything about your courses, lectures, assignments, quizzes, or how to use the platform!`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load saved chat history for this user
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(50);
      if (active && data && data.length > 0) {
        setMessages(data.map((m) => ({ role: m.role, content: m.content })));
      }
    })();
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (open && !minimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [messages, open, minimized]);

  const persist = async (role, content) => {
    if (!user) return;
    try {
      await supabase.from('chat_history').insert([{
        user_id: user.id,
        role,
        content,
        course_id: courseContext?.id || null
      }]);
    } catch (err) {
      console.error('Failed to persist chat message:', err);
    }
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setInput('');
    setLoading(true);
    await persist('user', trimmed);

    try {
      if (!hasGeminiConfig) {
        const notice = 'The AI tutor is unavailable because the Gemini API key is not configured.';
        setMessages((prev) => [...prev, { role: 'assistant', content: notice }]);
        return;
      }
      const reply = await generateChatReply(trimmed, {
        name: user?.name,
        role: user?.role,
        course: courseContext?.title || courseContext
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      await persist('assistant', reply);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: "Sorry, I couldn't process that right now. Please try again!" }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-accent shadow-2xl shadow-primary/30 flex items-center justify-center hover:scale-110 transition-transform duration-200 group"
        title="Ask AI Tutor"
      >
        <Sparkles className="w-6 h-6 text-white group-hover:animate-spin" />
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-background animate-pulse"></span>
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 w-80 md:w-96 flex flex-col bg-white dark:bg-card border border-border rounded-2xl shadow-2xl shadow-primary/10 overflow-hidden transition-all duration-300 ${minimized ? 'h-14' : 'h-[480px]'}`}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-primary to-accent text-white shrink-0">
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
          <Bot className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-xs">Learn Guru AI Tutor</p>
          <p className="text-[9px] text-white/70">Powered by Gemini • Always here to help</p>
        </div>
        <button onClick={() => setMinimized((p) => !p)} className="p-1 hover:bg-white/10 rounded-lg">
          <MinusCircle className="w-4 h-4" />
        </button>
        <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/10 rounded-lg">
          <X className="w-4 h-4" />
        </button>
      </div>

      {!minimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 items-start ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-primary/10' : 'bg-gradient-to-tr from-primary to-accent'}`}>
                  {msg.role === 'user'
                    ? <User className="w-3.5 h-3.5 text-primary" />
                    : <Sparkles className="w-3.5 h-3.5 text-white" />}
                </div>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-primary text-white rounded-tr-sm'
                    : 'bg-muted text-foreground rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 items-start">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-muted px-3 py-2 rounded-2xl rounded-tl-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border bg-white/50 dark:bg-black/10 shrink-0 flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about lectures, quizzes, XP..."
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-border bg-white dark:bg-black/20 outline-none focus:border-primary text-foreground"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="p-2 rounded-xl bg-primary text-white disabled:opacity-40 hover:bg-primary/90 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
