import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { catalogService } from '../../services/catalogService';
import { trustService } from '../../services/trustService';
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

export const AssistantPage: React.FC = () => {
  const [selectedProductId, setSelectedProductId] = useState<string>('amazon_rec_00000001');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-msg',
      sender: 'assistant',
      text: 'Welcome to the TrustSphere Intelligence Assistant. I provide evidence-grounded interpretations of marketplace anomaly signals across Amazon India, Flipkart, and Myntra.\n\nSelect a product to anchor this session in verified atomic evidence, or ask general questions about our zero-penalty multimodal fusion framework.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch sample products for context selector
  const { data: productsData } = useQuery({
    queryKey: ['assistant-product-selector'],
    queryFn: () => catalogService.getProducts({ limit: 8 }),
  });

  // Fetch assessment for selected product (validates selected product availability)
  useQuery({
    queryKey: ['assistant-product-assessment', selectedProductId],
    queryFn: () => trustService.getProductTrustAssessment(selectedProductId),
    enabled: Boolean(selectedProductId),
  });

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

  return (
    <div className="space-y-6 animate-fadeIn pb-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0D1B2A] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#3D7584]" />
            <span>TrustSphere Intelligence Assistant</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Grounded multimodal reasoning and evidence synthesis across marketplace investigations
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Knowledge-Grounded Reasoning Active</span>
        </div>
      </div>

      {/* Main Grid: Left Context Selector, Right Chat Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Product Context Anchor (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-[#DCE5E7] p-5 shadow-soft space-y-4">
          <div className="space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Investigation Context Anchor
            </h3>
            <p className="text-xs text-slate-600">
              Select a catalog product to ground all assistant inquiries in verified observations.
            </p>
          </div>

          <div className="space-y-2">
            {productsData?.items.map((prod) => (
              <div
                key={prod.canonical_product_id}
                onClick={() => setSelectedProductId(prod.canonical_product_id)}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  selectedProductId === prod.canonical_product_id
                    ? 'border-[#3D7584] bg-[#EBF2F4]/80 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-[#FAF7F2]'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                  <span className="font-semibold text-[#3D7584]">{prod.brand_name || 'Verified Brand'}</span>
                  <span className="font-mono">{prod.category}</span>
                </div>
                <p className="font-semibold text-[#0D1B2A] line-clamp-1">
                  {prod.product_title || prod.title}
                </p>
                <p className="font-mono text-[10px] text-slate-400 mt-1">
                  {prod.canonical_product_id}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Conversational Panel (8 Cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#DCE5E7] shadow-soft flex flex-col h-[650px] overflow-hidden">
          {/* Thread Header */}
          <div className="px-5 py-3.5 border-b border-slate-200 bg-[#FAF7F2] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#3D7584]" />
              <span className="text-xs font-semibold text-[#0D1B2A]">
                Context: <span className="font-mono text-[#3D7584]">{selectedProductId}</span>
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
              Evidence Engine v1.7
            </span>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'assistant' && (
                  <div className="h-8 w-8 rounded-xl bg-[#0D1B2A] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Bot className="w-4 h-4 text-[#89BBBE]" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-[#3D7584] text-white rounded-tr-none'
                      : 'bg-[#FAF7F2] border border-[#DCE5E7] text-slate-800 rounded-tl-none shadow-xs'
                  }`}
                >
                  <div className="whitespace-pre-line font-normal">{m.text}</div>

                  {m.evidence && m.evidence.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 space-y-1">
                      <span className="text-[10px] font-semibold text-slate-500 block">Supporting Evidence Citations:</span>
                      <div className="flex flex-wrap gap-1">
                        {m.evidence.map((ev, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 text-[10px] font-mono"
                          >
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                            {ev}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[9px] mt-2 font-mono">
                    {m.provider ? (
                      <span className="text-slate-400">Engine: {m.provider}</span>
                    ) : (
                      <span />
                    )}
                    <span className={m.sender === 'user' ? 'text-white/70' : 'text-slate-400'}>
                      {m.timestamp}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="text-xs text-slate-400 italic flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#3D7584] animate-pulse" />
                <span>Synthesizing evidence across multimodal engines...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          <div className="px-4 py-2 border-t border-slate-100 bg-[#FAF7F2]/50 flex flex-wrap gap-1.5">
            {[
              'Explain the zero-penalty invariant',
              'What are the 5 fusion modalities?',
              `Why was ${selectedProductId} given this risk tier?`,
            ].map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-4 border-t border-slate-200 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about this product's anomaly classification or evidence..."
                className="flex-1 bg-[#FAF7F2] text-xs text-slate-800 placeholder:text-slate-400 rounded-xl px-4 py-2.5 border border-[#BAC7CA] focus:border-[#3D7584] outline-none"
              />
              <Button type="submit" variant="primary" size="sm" disabled={!input.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
