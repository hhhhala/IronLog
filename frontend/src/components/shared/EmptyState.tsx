interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8">
      <span className="text-5xl mb-4">{icon}</span>
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      {description && <p className="text-gray-400 text-sm text-center mb-6">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="bg-amber-500 text-black font-semibold px-6 py-2.5 rounded-xl active:scale-95 transition-transform"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
