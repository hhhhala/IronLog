import { useEffect, useRef } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  height?: string; // e.g. '50vh', 'auto'
}

export default function BottomSheet({ open, onClose, title, children, height = '60vh' }: BottomSheetProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/60 animate-fade-in"
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-[#1a1a1a] rounded-t-3xl animate-slide-up"
        style={{
          maxHeight: height,
          paddingBottom: 'env(safe-area-inset-bottom, 16px)',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-gray-600" />
        </div>
        {/* Title */}
        {title && (
          <div className="px-5 pb-3">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          </div>
        )}
        {/* Content */}
        <div className="overflow-y-auto px-5 pb-6" style={{ maxHeight: `calc(${height} - 80px)` }}>
          {children}
        </div>
      </div>
    </div>
  );
}
