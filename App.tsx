
import React, { useState, useRef, useEffect } from 'react';
import { GeminiService } from './services/geminiService';
import { Message, ChatSession } from './types';

// --- Icons ---
const SendIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
);
const BotIcon = () => (
  <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
  </div>
);
const UserIcon = () => (
  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white shadow-sm flex-shrink-0 font-bold text-xs">YOU</div>
);
const CopyIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
);
const CheckIcon = () => (
  <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
);
const MenuIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
);
const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
);
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
);

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const geminiRef = useRef<GeminiService | null>(null);

  useEffect(() => {
    geminiRef.current = new GeminiService();
    if (sessions.length === 0) createNewSession();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, isLoading]);

  const createNewSession = () => {
    const id = Date.now().toString();
    const newSession: ChatSession = {
      id,
      title: 'New Discussion',
      messages: [],
      createdAt: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(id);
    setIsSidebarOpen(false);
  };

  const copyToClipboard = async (text: string, timestamp: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(timestamp);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !activeSessionId || isLoading) return;

    const userMsg: Message = {
      role: 'user',
      text: inputText,
      timestamp: Date.now()
    };

    const updatedSessions = sessions.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          messages: [...s.messages, userMsg],
          title: s.messages.length === 0 ? (inputText.length > 25 ? inputText.slice(0, 25) + '...' : inputText) : s.title
        };
      }
      return s;
    });

    setSessions(updatedSessions);
    setInputText('');
    setIsLoading(true);

    try {
      const activeSession = updatedSessions.find(s => s.id === activeSessionId);
      if (!activeSession) return;

      const responseText = await geminiRef.current!.sendMessage(
        activeSession.messages.slice(0, -1),
        userMsg.text
      );

      const botMsg: Message = {
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };

      setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, botMsg] } : s));
    } catch (error) {
      const errorMsg: Message = {
        role: 'model',
        text: "System Error: Unable to fetch standards from the AI. Check your API configuration.",
        timestamp: Date.now()
      };
      setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, errorMsg] } : s));
    } finally {
      setIsLoading(false);
    }
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-800 overflow-hidden font-sans">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-slate-900 flex flex-col z-50 transition-transform duration-300 transform md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-lg leading-tight flex items-center gap-2">
              <span className="text-amber-500">OMAN</span> ROAD AI
            </h1>
            <p className="text-slate-500 text-[10px] uppercase tracking-wider mt-1 font-semibold">Technical Standards 2017</p>
          </div>
          <button className="md:hidden text-slate-400" onClick={() => setIsSidebarOpen(false)}><CloseIcon /></button>
        </div>
        
        <div className="p-4">
          <button 
            onClick={createNewSession}
            className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl flex items-center justify-center gap-2 transition-all font-semibold text-sm shadow-lg shadow-amber-900/20"
          >
            <PlusIcon /> New Session
          </button>
        </div>

        <nav className="flex-grow overflow-y-auto custom-scrollbar p-2 space-y-1.5">
          <div className="px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Recent Chats</div>
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => { setActiveSessionId(s.id); setIsSidebarOpen(false); }}
              className={`w-full text-left p-3 rounded-xl text-sm transition-all group ${
                s.id === activeSessionId ? 'bg-slate-800 text-white ring-1 ring-slate-700' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <div className="truncate font-medium">{s.title}</div>
              <div className="text-[10px] opacity-40 mt-1 flex items-center gap-1.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {new Date(s.createdAt).toLocaleDateString()}
              </div>
            </button>
          ))}
        </nav>

        <div className="p-5 mt-auto bg-slate-950/40 border-t border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase font-bold">Model: Gemini-3-Flash</span>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-grow flex flex-col relative min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 md:px-6 justify-between shrink-0 shadow-sm z-30">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" onClick={() => setIsSidebarOpen(true)}>
              <MenuIcon />
            </button>
            <div className="flex flex-col">
              <h2 className="font-bold text-slate-900 truncate text-sm md:text-base max-w-[150px] md:max-w-none">
                {activeSession?.title || 'Engineering Assistant'}
              </h2>
              <span className="text-[10px] text-slate-400 font-medium md:hidden">Volume 3: Road Specifications</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={createNewSession}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-all"
            >
              <PlusIcon /> <span className="hidden sm:inline">NEW CHAT</span>
            </button>
            <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>
            <span className="hidden sm:flex items-center gap-1.5 text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1.5 rounded-full font-bold uppercase border border-slate-200">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              Standard 2017
            </span>
          </div>
        </header>

        {/* Chat Feed */}
        <div className="flex-grow overflow-y-auto custom-scrollbar bg-[#fcfdfe]">
          <div className="max-w-4xl mx-auto p-4 md:p-10 space-y-8">
            {!activeSession?.messages.length && (
              <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="w-24 h-24 bg-gradient-to-br from-amber-50 to-amber-100 rounded-3xl flex items-center justify-center mb-8 shadow-inner border border-amber-200">
                  <svg className="w-12 h-12 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.168.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Oman Highway Support AI</h3>
                <p className="text-slate-500 max-w-lg mx-auto leading-relaxed text-sm md:text-base font-medium">
                  I am a technical assistant grounded in the Sultanate of Oman Ministry of Transport Highway Design Standards 2017. How can I assist your engineering query today?
                </p>
                <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl px-4">
                  {[
                    "Concrete cover requirements for marine exposure?",
                    "Minimum lane width for 1-way construction traffic?",
                    "Standard tolerances for cast-in-place piling?",
                    "Soil density requirements for embankments?"
                  ].map((q, i) => (
                    <button 
                      key={i}
                      onClick={() => setInputText(q)}
                      className="group p-4 bg-white border border-slate-200 rounded-2xl text-xs hover:border-amber-400 hover:bg-amber-50 transition-all text-left shadow-sm hover:shadow-md"
                    >
                      <div className="text-amber-600 font-bold mb-1 opacity-60 group-hover:opacity-100 uppercase tracking-widest text-[9px]">Query Example</div>
                      <span className="text-slate-700 font-semibold">"{q}"</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeSession?.messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex gap-3 md:gap-5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {msg.role === 'model' ? <BotIcon /> : <UserIcon />}
                <div className={`relative max-w-[85%] md:max-w-[75%] p-4 md:p-5 rounded-2xl shadow-sm border group transition-all ${
                  msg.role === 'user' 
                    ? 'bg-slate-800 text-white border-slate-700 rounded-tr-none' 
                    : 'bg-white text-slate-800 border-slate-200 rounded-tl-none hover:border-slate-300'
                }`}>
                  <div className="text-sm md:text-[15px] leading-relaxed whitespace-pre-wrap font-medium">
                    {msg.text}
                  </div>
                  
                  <div className={`flex items-center justify-between mt-4 pt-3 border-t ${msg.role === 'user' ? 'border-slate-700/50' : 'border-slate-100'}`}>
                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    
                    {msg.role === 'model' && (
                      <button
                        onClick={() => copyToClipboard(msg.text, msg.timestamp)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-amber-50 text-[10px] font-bold text-slate-500 hover:text-amber-700 transition-all border border-slate-200 hover:border-amber-200 active:scale-95"
                        title="Copy text"
                      >
                        {copiedId === msg.timestamp ? <CheckIcon /> : <CopyIcon />}
                        <span>{copiedId === msg.timestamp ? 'COPIED' : 'COPY'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-4 animate-in fade-in duration-300">
                <BotIcon />
                <div className="bg-white border border-slate-200 p-5 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-2">Consulting Standards...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} className="h-4" />
          </div>
        </div>

        {/* Floating Input Dock */}
        <div className="p-4 md:p-8 bg-white border-t border-slate-200/60 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
          <div className="max-w-4xl mx-auto relative group">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Query the 2017 Highway Design Standards..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 pr-14 focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all resize-none shadow-inner text-sm md:text-base min-h-[58px] max-h-40 custom-scrollbar font-medium"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || isLoading}
              className={`absolute right-2.5 top-2.5 p-3 rounded-xl transition-all shadow-md ${
                inputText.trim() && !isLoading
                  ? 'bg-amber-600 text-white hover:bg-amber-700 active:scale-95 shadow-amber-200'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              <SendIcon />
            </button>
          </div>
          <div className="flex items-center justify-center gap-4 mt-4">
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
              Official Reference Tool • Sultanate of Oman Ministry of Transport
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
