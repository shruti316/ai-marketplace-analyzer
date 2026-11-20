import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { catalogService } from '../../services/catalogService';
import { investigateService } from '../../services/investigateService';
import {
  Sparkles,
  Bot,
  Send,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  provider?: string;
  evidence?: string[];
}

const SUGGESTED_PROMPTS = [
  'Why does this product have this risk assessment?',
  'How does the price compare to the category median corridor?',
  'What are the recurring customer complaints in the ABSA reviews?',
  'Explain how the Zero-Penalty Guarantee protects missing modalities.',
];

export const AssistantPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const paramProductId = searchParams.get('productId') || searchParams.get('id');

  const [selectedProductId, setSelectedProductId] = useState<string>(
    paramProductId || 'amazon_in_B000052YQN'
  );
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-msg',
      sender: 'assistant',
      text: 'Welcome to the TrustSphere Intelligence Assistant. I provide evidence-grounded interpretations of marketplace anomaly signals, pricing corridors, and NLP review sentiment across Amazon India, Flipkart, and Myntra.\n\nAsk me any question regarding your investigated offerings or our multimodal zero-penalty evaluation framework.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch product metadata if available to show friendly active title
  const { data: activeProduct } = useQuery({
    queryKey: ['assistant-active-product', selectedProductId],
    queryFn: () => catalogService.getProductById(selectedProductId),
    enabled: Boolean(selectedProductId),
  });

  // Keep selectedProductId in sync with URL params
  useEffect(() => {
    if (paramProductId) {
      setSelectedProductId(paramProductId);
    }
  }, [paramProductId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (textToSend?: string) => {
    const q = (textToSend || input).trim();
    if (!q || isTyping) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // Build conversation history (omit system greeting)
      const history = messages
        .filter((m) => m.id !== 'init-msg')
        .map((m) => ({
          role: m.sender,
          content: m.text,
        }));

      const res = await investigateService.chatAssistant(
        q,
        selectedProductId || undefined,
        history
      );

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: res.message.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: res.provider_info.provider,
        evidence: res.evidence_citations,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Assistant query failed';
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: `Error communicating with grounded assistant: ${errMsg}. Please verify that backend (port 5000) and ML service (port 8000) are running.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#ECE8F2]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#16131F] font-heading flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#7C5DFA]" />
            <span>TrustSphere Intelligence Assistant</span>
          </h1>
          <p className="text-xs text-[#806C79] mt-0.5">
            Grounded multimodal reasoning, pricing corridor analysis, and evidence synthesis across marketplace investigations
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Knowledge-Grounded Reasoning Active</span>
        </div>
      </div>

      {/* Full-Width Conversational Canvas */}
      <div className="bg-white rounded-[24px] border border-[#ECE8F2] shadow-[0_8px_24px_rgba(22,19,31,0.05)] flex flex-col h-[700px] overflow-hidden">
        {/* Thread Header with Active Grounding Context */}
        <div className="px-6 py-4 border-b border-[#ECE8F2] bg-[#FDFCFE] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#EDE9FE] text-[#7C5DFA] border border-[#7C5DFA]/20">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#16131F]">TrustSphere Assistant</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                  Online
                </span>
              </div>
              <p className="text-[11px] text-[#806C79] font-mono mt-0.5">
                Active Grounding Context: <span className="text-[#7C5DFA] font-semibold">{activeProduct?.product_title || selectedProductId}</span>
              </p>
            </div>
          </div>

          <span className="text-[10px] font-mono text-[#806C79] bg-[#F9F8FC] px-2.5 py-1 rounded-lg border border-[#ECE8F2]">
            Evidence Engine v1.7
          </span>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'assistant' && (
                <div className="h-8 w-8 rounded-xl bg-[#EDE9FE] text-[#7C5DFA] border border-[#ECE8F2] flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-[18px] p-4 text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-[#7C5DFA] text-white rounded-tr-none shadow-xs'
                    : 'bg-[#F9F8FC] border border-[#ECE8F2] text-[#16131F] rounded-tl-none shadow-xs'
                }`}
              >
                <div className="whitespace-pre-line font-normal">{m.text}</div>

                {/* Evidence Citations */}
                {m.evidence && m.evidence.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#ECE8F2] space-y-1.5">
                    <span className="text-[10px] font-bold text-[#806C79] uppercase tracking-wider block font-mono">
                      Corroborating Evidence Citations:
                    </span>
                    <ul className="space-y-1">
                      {m.evidence.map((ev, idx) => (
                        <li
                          key={idx}
                          className="flex items-center gap-1.5 text-[11px] text-[#7C5DFA] bg-white px-2 py-1 rounded-md border border-[#ECE8F2]"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="font-mono truncate">{ev}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className={`mt-2 text-[10px] text-right font-mono ${m.sender === 'user' ? 'text-white/70' : 'text-[#806C79]'}`}>
                  {m.timestamp}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3 justify-start">
              <div className="h-8 w-8 rounded-xl bg-[#EDE9FE] text-[#7C5DFA] border border-[#ECE8F2] flex items-center justify-center shrink-0 shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-[#F9F8FC] border border-[#ECE8F2] text-[#4A3F4B] rounded-[18px] rounded-tl-none p-4 text-xs shadow-xs flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#7C5DFA] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-[#7C5DFA] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-[#7C5DFA] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-[11px] text-[#806C79] font-mono ml-2">Grounded reasoning in progress...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Prompts */}
        <div className="px-6 py-2.5 border-t border-[#ECE8F2] bg-[#FDFCFE] overflow-x-auto">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-[#806C79] shrink-0 uppercase tracking-wider font-semibold">
              Suggested:
            </span>
            <div className="flex items-center gap-2 flex-nowrap">
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  disabled={isTyping}
                  className="px-3 py-1 rounded-lg bg-[#F9F8FC] hover:bg-[#EDE9FE]/50 border border-[#ECE8F2] text-[11px] text-[#4A3F4B] hover:text-[#16131F] transition-all whitespace-nowrap cursor-pointer disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-[#ECE8F2] bg-[#FDFCFE]">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isTyping}
              placeholder="Ask a question about this product's trust signals, reviews, or price corridor..."
              className="flex-1 bg-[#F9F8FC] border border-[#ECE8F2] rounded-xl px-4 py-3 text-xs sm:text-sm text-[#16131F] placeholder:text-[#806C79] focus:outline-none focus:border-[#7C5DFA] focus:ring-1 focus:ring-[#7C5DFA] transition-all"
            />
            <Button
              variant="primary"
              size="md"
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              rightIcon={<Send className="w-3.5 h-3.5" />}
              className="bg-[#7C5DFA] hover:bg-[#6A49F2] text-white font-semibold"
            >
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
