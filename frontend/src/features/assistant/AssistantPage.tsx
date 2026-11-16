import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { catalogService } from '../../services/catalogService';
import { trustService } from '../../services/trustService';
import {
  Sparkles,
  Bot,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { ProductTrustAssessment } from '../../types/trust';
import { Button } from '../../components/ui/Button';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
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

  // Fetch sample products for context selector
  const { data: productsData } = useQuery({
    queryKey: ['assistant-product-selector'],
    queryFn: () => catalogService.getProducts({ limit: 8 }),
  });

  // Fetch assessment for selected product
  const { data: assessmentData } = useQuery({
    queryKey: ['assistant-product-assessment', selectedProductId],
    queryFn: () => trustService.getProductTrustAssessment(selectedProductId),
    enabled: Boolean(selectedProductId),
  });

  const assessment = assessmentData?.assessment as ProductTrustAssessment | undefined;

  const handleSend = (textToSend?: string) => {
    const q = (textToSend || input).trim();
    if (!q) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      let ans = '';
      const lower = q.toLowerCase();

      if (lower.includes('zero-penalty') || lower.includes('penalty')) {
        ans = `**The Zero-Penalty Modeling Invariant:**\n\nWhen a product offering lacks certain observation channels (e.g., zero reviews on a newly published listing, or no packaging photos), our fusion engine does NOT treat the absence of data as evidence of fraud. Instead, it classifies the product as \`UNASSESSED_SPARSE_DATA\` if fewer than 2 core modalities exist, preventing systemic false alarms against genuine new merchant listings.`;
      } else if (lower.includes('modalities') || lower.includes('fusion') || lower.includes('modal')) {
        ans = `**The 5 Learned Fusion Modalities:**\n\n1. **Pricing**: Evaluates robust z-scores against category rolling corridors.\n2. **Review NLP**: Evaluates review velocity, sentiment discordance, and synthetic text signatures.\n3. **Vision CV**: Detects perceptual image duplicates (dHash) and background cleanliness.\n4. **CLIP Text-Image**: Evaluates cross-modal cosine similarity between listing titles and visual assets.\n5. **Graph Topology**: Identifies seller co-listing density and merchant clustering.\n\n*Note: Packaging OCR operates as an independent evidence-only engine.*`;
      } else if (assessment) {
        ans = `**Analysis for ${selectedProductId}:**\n\n• **Overall Risk Tier**: \`${assessment.overall_risk_tier}\`\n• **Core Modalities Available**: ${assessment.available_core_modalities_count}/5\n• **Recommendation Summary**: ${assessment.recommendation_summary || 'Standard monitoring baseline.'}\n\n*All insights are synthesized directly from verified database records.*`;
      } else {
        ans = `TrustSphere utilizes explainable, calibrated risk tiers rather than pseudo-probabilities. You can select any product from the catalog list on the left to inspect its active modalities, pricing corridor variances, and evidence limitations.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'assistant',
          text: ans,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setIsTyping(false);
    }, 450);
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
                      : 'bg-[#FAF7F2] border border-[#DCE5E7] text-slate-800 rounded-tl-none'
                  }`}
                >
                  <div className="whitespace-pre-line font-normal">{m.text}</div>
                  <div
                    className={`text-[9px] mt-2 font-mono text-right ${
                      m.sender === 'user' ? 'text-white/70' : 'text-slate-400'
                    }`}
                  >
                    {m.timestamp}
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="text-xs text-slate-400 italic flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#3D7584] animate-pulse" />
                <span>Synthesizing evidence...</span>
              </div>
            )}
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
