import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, X, AlertCircle, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export interface ImageUploadTabProps {
  onStartInvestigation?: (file: File) => void;
}

export const ImageUploadTab: React.FC<ImageUploadTabProps> = ({ onStartInvestigation }) => {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  const maxSizeBytes = 10 * 1024 * 1024; // 10MB

  const handleFile = (file: File) => {
    setErrorMessage(null);

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
    setUploadProgress(0);
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setUploadProgress(25);

    // Simulate pipeline ingestion client preparation
    const timer1 = setTimeout(() => setUploadProgress(70), 300);
    const timer2 = setTimeout(() => {
      setUploadProgress(100);
      setIsProcessing(false);
      if (onStartInvestigation) {
        onStartInvestigation(selectedFile);
      }
    }, 700);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
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
              ? 'border-[#3D7584] bg-[#EBF2F4]/60 scale-[1.01]'
              : 'border-[#BAC7CA] hover:border-[#3D7584] bg-white hover:bg-[#FAF7F2]'
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
            <div className="h-16 w-16 rounded-2xl bg-[#EBF2F4] text-[#3D7584] flex items-center justify-center shadow-inner">
              <UploadCloud className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-semibold text-[#0D1B2A]">
                Drag and drop your product packaging or catalog image
              </p>
              <p className="text-xs text-slate-500">
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
        <div className="p-6 rounded-2xl bg-white border border-[#DCE5E7] shadow-soft space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {previewUrl && (
                <div className="h-20 w-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                  <img
                    src={previewUrl}
                    alt="Product preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-[#0D1B2A] truncate max-w-xs">
                    {selectedFile.name}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Validated
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Type: {selectedFile.type}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                leftIcon={<X className="w-4 h-4" />}
                disabled={isProcessing}
              >
                Remove
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                isLoading={isProcessing}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Analyze Image
              </Button>
            </div>
          </div>

          {/* Upload Progress Simulation */}
          {isProcessing && (
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Preparing image vectorization & dHash inspection...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#3D7584] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Validation Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Transparent Pipeline Status */}
      <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#DCE5E7] text-xs text-[#0D1B2A] space-y-2">
        <div className="flex items-center gap-2 font-semibold text-[#3D7584]">
          <ShieldCheck className="w-4 h-4" />
          <span>Multimodal Visual Intelligence Pipeline Status</span>
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          Uploaded images are processed by frozen vision models for perceptual hashing (dHash), background cleanliness,
          blurriness scoring, and CLIP image-text cross-modal category discordance.
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-slate-500 font-mono">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Client Validation: Active
          </span>
          <span className="text-slate-300">•</span>
          <span>Max Size: 10MB</span>
          <span className="text-slate-300">•</span>
          <span>Zero Data Fabrication Enforced</span>
        </div>
      </div>
    </div>
  );
};
