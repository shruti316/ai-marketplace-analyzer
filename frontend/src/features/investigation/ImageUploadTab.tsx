import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  X,
  AlertCircle,
  ShieldCheck,
  Eye,
  FileText,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { investigateService, ImageInspectionResult } from '../../services/investigateService';

export interface ImageUploadTabProps {
  onStartInvestigation?: (file: File) => void;
}

export const ImageUploadTab: React.FC<ImageUploadTabProps> = () => {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [inspectionResult, setInspectionResult] = useState<ImageInspectionResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  const maxSizeBytes = 10 * 1024 * 1024; // 10MB

  const handleFile = (file: File) => {
    setErrorMessage(null);
    setInspectionResult(null);

    if (!allowedTypes.includes(file.type)) {
      setErrorMessage('Invalid file type. Please upload a PNG, JPEG, or WebP image.');
      return;
    }

    if (file.size > maxSizeBytes) {
      setErrorMessage(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is 10MB.`);
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setErrorMessage(null);
    setInspectionResult(null);
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleInspectImage = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Convert file to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file buffer'));
        reader.readAsDataURL(selectedFile);
      });

      // Call live Python CV and OCR inspection endpoint through Express backend
      const result = await investigateService.inspectImage(base64Data);
      setInspectionResult(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Image inspection failed.';
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      {!selectedFile ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer select-none ${
            dragActive
              ? 'border-indigo-500 bg-indigo-950/30 scale-[1.01]'
              : 'border-white/[0.08] hover:border-indigo-500/50 bg-[#181D2E]/40 hover:bg-[#181D2E]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }}
          />

          <div className="flex flex-col items-center justify-center space-y-4 max-w-sm mx-auto">
            <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shadow-inner">
              <UploadCloud className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-100 font-heading">
                Drag and drop your product packaging or catalog image
              </p>
              <p className="text-xs text-slate-400">
                Supports PNG, JPEG, or WebP up to 10MB
              </p>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              leftIcon={<ImageIcon className="w-4 h-4" />}
            >
              Browse Files
            </Button>
          </div>
        </div>
      ) : (
        /* Selected Image Preview Card */
        <div className="p-6 rounded-2xl bg-[#181D2E] border border-white/[0.08] shadow-soft space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {previewUrl && (
                <div className="h-20 w-20 rounded-xl overflow-hidden bg-[#111522] border border-white/[0.08] shrink-0">
                  <img
                    src={previewUrl}
                    alt="Product preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-100 break-all font-heading">
                  {selectedFile.name}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                  <span>{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                  <span>•</span>
                  <span className="uppercase font-medium text-indigo-400">
                    {selectedFile.type.split('/')[1]}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={isProcessing}
                leftIcon={<X className="w-4 h-4" />}
                className="text-slate-400 hover:text-rose-400"
              >
                Clear
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleInspectImage}
                isLoading={isProcessing}
                leftIcon={<Eye className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                {isProcessing ? 'Analyzing Image...' : 'Inspect Image Evidence'}
              </Button>
            </div>
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="space-y-1">
                <p className="font-semibold text-rose-200">Inspection Failed</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Live Inspection Results Breakdown */}
          {inspectionResult && (
            <div className="space-y-5 pt-4 border-t border-white/[0.08] animate-fadeIn">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  <span className="text-sm font-bold text-slate-100 font-heading">
                    Live Visual & Packaging Findings
                  </span>
                </div>
                <Badge
                  variant={inspectionResult.processing_status === 'SUCCESS' ? 'risk-low' : 'risk-moderate'}
                  size="sm"
                >
                  {inspectionResult.processing_status}
                </Badge>
              </div>

              {/* Quality & Resolution Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-[#111522] border border-white/[0.08]">
                  <p className="text-[11px] font-medium text-slate-400 font-mono">Dimensions</p>
                  <p className="text-sm font-bold text-slate-100 mt-0.5 font-heading">
                    {inspectionResult.image_metadata.width} × {inspectionResult.image_metadata.height}px
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-[#111522] border border-white/[0.08]">
                  <p className="text-[11px] font-medium text-slate-400 font-mono">Laplacian Blur Score</p>
                  <p className="text-sm font-bold text-slate-100 mt-0.5 font-heading">
                    {inspectionResult.quality_findings.blur_score.toFixed(1)}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-[#111522] border border-white/[0.08]">
                  <p className="text-[11px] font-medium text-slate-400 font-mono">Resolution Tier</p>
                  <p className="text-sm font-bold text-slate-100 mt-0.5 font-heading">
                    {inspectionResult.quality_findings.resolution_tier}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-[#111522] border border-white/[0.08]">
                  <p className="text-[11px] font-medium text-slate-400 font-mono">White Background</p>
                  <p className="text-sm font-bold text-slate-100 mt-0.5 font-heading">
                    {inspectionResult.quality_findings.is_white_background ? 'Detected' : 'Natural/Studio'}
                  </p>
                </div>
              </div>

              {/* OCR Extracted Packaging Fields */}
              <div className="p-4 rounded-xl bg-[#111522] border border-white/[0.08] space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-semibold text-slate-200 font-heading">
                    Statutory Packaging Identifiers (Physical OCR)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400">Detected MRP: </span>
                    <span className="font-semibold text-slate-100">
                      {inspectionResult.ocr_findings.extracted_mrp
                        ? `₹${inspectionResult.ocr_findings.extracted_mrp}`
                        : 'Not detected on packaging'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Net Quantity: </span>
                    <span className="font-semibold text-slate-100">
                      {inspectionResult.ocr_findings.extracted_net_quantity || 'Not detected'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Batch / Mfg Code: </span>
                    <span className="font-semibold text-slate-100">
                      {inspectionResult.ocr_findings.extracted_batch_code || 'Not detected'}
                    </span>
                  </div>
                </div>
                {inspectionResult.ocr_findings.detected_text && (
                  <div className="pt-2 border-t border-white/[0.08]">
                    <p className="text-[11px] font-medium text-slate-400 mb-1 font-mono">Raw Detected Text:</p>
                    <p className="text-xs text-slate-300 bg-[#0B0D14] p-2.5 rounded-lg border border-white/[0.08] max-h-24 overflow-y-auto font-mono">
                      {inspectionResult.ocr_findings.detected_text}
                    </p>
                  </div>
                )}
              </div>

              {/* Warnings List */}
              {inspectionResult.warnings.length > 0 && (
                <div className="space-y-1.5">
                  {inspectionResult.warnings.map((w, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-amber-300 bg-amber-950/20 px-3 py-1.5 rounded-lg border border-amber-500/30">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Invariant Grounding Notice */}
              <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/30 text-[11px] text-indigo-300 leading-relaxed">
                <strong className="text-indigo-200">Architectural Note:</strong> Image inspection provides isolated visual asset and statutory packaging evidence. In accordance with TrustSphere invariants, visual quality observations alone do not constitute a full multi-modal product trust assessment.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
