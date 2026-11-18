import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Send,
  ShieldCheck,
  Bot,
  User as UserIcon,
  CheckCircle2,
} from 'lucide-react';
import { ProductTrustAssessment, UnifiedEvidenceItem } from '../../types/trust';
import { Product } from '../../types/catalog';
import { investigateService } from '../../services/investigateService';

export interface AssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product;
  assessment?: ProductTrustAssessment;
  evidenceItems?: UnifiedEvidenceItem[];
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  supportingEvidenceIds?: string[];
  provider?: string;
}

export const AssistantDrawer: React.FC<AssistantDrawerProps> = ({
  isOpen,
  onClose,
  product,
  assessment,
  evidenceItems = [],
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize contextual greeting whenever product context opens
  useEffect(() => {
    if (!product && !assessment) {
      setMessages([
        {
          id: 'welcome-generic',
          sender: 'assistant',
          text: 'Hello. I am the TrustSphere Intelligence Assistant. Select any marketplace product or investigation to inspect multimodal anomaly findings, evaluate evidence limitations, or review cross-marketplace pricing corridors.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      return;
    }

    const title = product?.product_title || product?.title || assessment?.canonical_product_id || 'this product';
    const tier = assessment?.overall_risk_tier || 'UNASSESSED_SPARSE_DATA';
    const coreCount = assessment?.available_core_modalities_count ?? 0;

    let tierExplanation = '';
    if (tier === 'LOW_OBSERVED_ANOMALY') {
      tierExplanation = 'The product exhibits consistent pricing corridors, valid seller affiliation, and coherent cross-modal indicators.';
    } else if (tier === 'MODERATE_SINGLE_MODALITY_ANOMALY') {
      tierExplanation = 'An isolated anomaly was observed in a single modality (such as pricing or image reuse), while other available indicators remained baseline.';
    } else if (tier === 'ELEVATED_MULTIMODAL_ANOMALY') {
      tierExplanation = 'Multiple independent modalities flagged corroborating anomalies (e.g. price discordance combined with synthetic review clusters or packaging mismatch). Note: This is an anomaly indicator, not confirmed counterfeit.';
    } else {
      tierExplanation = 'Data observations are sparse (<2 core modalities observed). The zero-penalty invariant was applied to prevent false alarm penalties.';
    }

    setMessages([
      {
        id: `welcome-${product?.canonical_product_id || 'asmt'}`,
        sender: 'assistant',
        text: `I have analyzed the multimodal evidence for "${title}".\n\nOverall Risk Tier: ${tier}\nCore Modalities Observed: ${coreCount}/5.\n\n${tierExplanation}\n\nHow would you like to explore this investigation?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, [product, assessment]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const generateAnswer = (query: string): string => {
    const q = query.toLowerCase();

    // 1. Why was this product assigned this tier?
    if (q.includes('why') || q.includes('tier') || q.includes('classification')) {
      const tier = assessment?.overall_risk_tier || 'UNASSESSED_SPARSE_DATA';
      const flags = assessment?.negative_evidence || [];
      const positive = assessment?.positive_evidence || [];

      let resp = `This product was classified as **${tier}** based on our calibrated explainable fusion model.\n\n`;
      if (flags.length > 0) {
        resp += `**Flagged Anomaly Indicators:**\n${flags.map((f) => `• ${f}`).join('\n')}\n\n`;
      } else {
        resp += `• No critical anomalies were observed across the evaluated modalities.\n\n`;
      }
      if (positive.length > 0) {
        resp += `**Corroborating Baseline Signals:**\n${positive.map((p) => `• ${p}`).join('\n')}\n\n`;
      }
      resp += `*Compliance Note: An elevated anomaly classification reflects statistical and policy discordance, NOT legal proof of counterfeit goods.*`;
      return resp;
    }

    // 2. Modalities and limitations
    if (q.includes('modality') || q.includes('modalities') || q.includes('missing') || q.includes('unavailable')) {
      const missing = assessment?.missing_modalities || [];
      const breakdown = assessment?.modality_breakdown || {};

      let resp = `**Modality Evaluation Breakdown:**\n\n`;
      Object.entries(breakdown).forEach(([modName, modData]) => {
        resp += `• **${modName}**: Status is \`${modData.modality_status}\` (${modData.summary_text})\n`;
      });

      if (missing.length > 0) {
        resp += `\n**Unobserved Modalities (${missing.length}):**\n${missing.map((m) => `• ${m}: Not present in source scrape`).join('\n')}\n`;
        resp += `\n*The Zero-Penalty Modeling Invariant ensures these unobserved channels are excluded from scoring rather than penalized.*`;
      }
      return resp;
    }

    // 3. Pricing
    if (q.includes('price') || q.includes('mrp') || q.includes('discount')) {
      const priceEvidence = evidenceItems.filter((e) => e.evidence_modality === 'PRICING');
      if (priceEvidence.length > 0) {
        let resp = `**Pricing Intelligence:**\n\n`;
        priceEvidence.forEach((pe) => {
          resp += `• ${pe.observed_value} (${pe.detection_method}, Severity: \`${pe.signal_severity}\`)\n`;
          if (pe.uncertainty_note) resp += `  *Note: ${pe.uncertainty_note}*\n`;
        });
        return resp;
      }
      return `Pricing was evaluated against platform price corridors. No extreme outlier anomalies were recorded for this listing.`;
    }

    // 4. Limitations
    if (q.includes('limitation') || q.includes('uncertainty') || q.includes('confidence')) {
      const limits = assessment?.assessment_limitations || [];
      if (limits.length > 0) {
        return `**Documented Assessment Limitations:**\n\n${limits.map((l) => `• ${l}`).join('\n')}\n\n*All inferences reflect point-in-time catalog observations.*`;
      }
      return `Assessments are limited by the availability of public marketplace catalog scrapes. Third-party merchant corporate tax IDs are omitted by marketplaces.`;
    }

    // Default grounded fallback
    return `Based on the ${evidenceItems.length} verified evidence items for this product, the platform synthesizes signals across pricing, reviews, image perceptual hashing, CLIP consistency, and seller network clustering. You can ask specifically about pricing anomalies, image duplicate status, or evidence limitations.`;
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isTyping) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const canonicalId = product?.canonical_product_id || assessment?.canonical_product_id;
      const history = messages
        .filter((m) => !m.id.startsWith('welcome-'))
        .map((m) => ({
          role: m.sender,
          content: m.text,
        }));

      const res = await investigateService.chatAssistant(text, canonicalId, history);
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: res.message.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        supportingEvidenceIds: res.evidence_citations,
        provider: res.provider_info.provider,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      // Graceful fallback to deterministic local logic if network disconnects
      const answer = generateAnswer(text);
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: 'LOCAL_DETERMINISTIC_FALLBACK',
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) return null;

  const suggestedQuestions = [
    `Why is this product assigned ${assessment?.overall_risk_tier?.replace(/_/g, ' ') || 'its risk tier'}?`,
    'Which modalities had observed anomalies?',
    'What evidence limitations apply to this product?',
    'How does pricing compare to market corridors?',
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0D1B2A]/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <aside className="relative w-full max-w-lg bg-[#111522] text-slate-100 flex flex-col h-full shadow-2xl z-10 border-l border-white/[0.08] animate-slideLeft">
        {/* Header */}
        <div className="h-16 px-5 border-b border-white/[0.08] bg-[#181D2E] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-100 font-heading">TrustSphere Assistant</h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-950/40 text-indigo-300 font-semibold border border-indigo-500/30">
                  Grounded
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Contextual evidence reasoning for active investigation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-white/[0.05] transition-colors"
            aria-label="Close assistant panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* System Capability Banner */}
        <div className="px-5 py-2.5 bg-indigo-950/20 border-b border-indigo-500/20 text-[11px] text-indigo-300 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>Responses are strictly synthesized from verified atomic engine observations.</span>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'assistant' && (
                <div className="h-8 w-8 rounded-xl bg-[#181D2E] text-indigo-400 border border-white/[0.08] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-sm'
                    : 'bg-[#181D2E] border border-white/[0.08] text-slate-200 rounded-tl-none shadow-soft'
                }`}
              >
                <div className="whitespace-pre-line font-normal space-y-1">
                  {msg.text}
                </div>

                {msg.supportingEvidenceIds && msg.supportingEvidenceIds.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-white/[0.08] space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 block font-mono">Corroborated Evidence:</span>
                    <div className="flex flex-wrap gap-1">
                      {msg.supportingEvidenceIds.map((ev, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#111522] border border-white/[0.08] text-slate-300 text-[9px] font-mono"
                        >
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                          {ev}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-[9px] mt-2 font-mono">
                  {msg.provider ? (
                    <span className="text-slate-400">Engine: {msg.provider}</span>
                  ) : (
                    <span />
                  )}
                  <span className={msg.sender === 'user' ? 'text-white/70' : 'text-slate-500'}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>

              {msg.sender === 'user' && (
                <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3 items-center text-xs text-slate-400 italic pl-1">
              <Bot className="w-4 h-4 text-indigo-400 animate-pulse" />
              <span>Synthesizing multimodal evidence...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Contextual Suggested Questions */}
        <div className="px-4 py-2 border-t border-white/[0.08] bg-[#181D2E]/50 space-y-1.5">
          <p className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 font-mono">
            Suggested Investigation Inquiries:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-[#111522] hover:bg-[#181D2E] text-slate-300 border border-white/[0.08] hover:border-indigo-500/40 transition-all text-left truncate max-w-full"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-[#111522] border-t border-white/[0.08] shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask about this product's anomaly evidence or risk..."
              className="flex-1 bg-[#181D2E] text-xs text-slate-100 placeholder:text-slate-500 rounded-xl px-4 py-2.5 border border-white/[0.08] focus:border-indigo-500 outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-500 transition-colors disabled:opacity-40"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
};
