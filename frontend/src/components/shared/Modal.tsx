interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={onClose} />
      <div className="relative bg-[#1a1a1a] rounded-2xl w-full max-w-sm animate-slide-up overflow-hidden">
        {title && (
          <div className="px-5 py-4 border-b border-gray-800">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
