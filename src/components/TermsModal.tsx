"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTermsContent, type TermsType } from "@/lib/terms";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: TermsType;
}

export function TermsModal({ isOpen, onClose, type }: TermsModalProps) {
  if (!isOpen) return null;

  const terms = getTermsContent(type);

  return (
    <>
      {/* 오버레이 */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{terms.title}</h2>
              <p className="text-sm text-gray-500 mt-1">시행일: {terms.effectiveDate}</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* 내용 */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">
                {terms.content}
              </pre>
            </div>
          </div>

          {/* 푸터 */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
            <Button
              onClick={onClose}
              variant="brand-primary"
              className="px-8 py-2.5"
            >
              확인
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
