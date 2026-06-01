import { useEffect, useState } from 'react';
import { APP_VERSION, CHANGELOG, ChangelogEntry } from '@/utils/changelog';

const STORAGE_KEY = 'ironlog_last_seen_version';

/**
 * Check if user has seen the latest update.
 * If not, show a changelog modal on first launch.
 */
export default function UpdateAnnouncement() {
  const [entry, setEntry] = useState<ChangelogEntry | null>(null);

  useEffect(() => {
    const lastSeen = localStorage.getItem(STORAGE_KEY);
    if (lastSeen !== APP_VERSION) {
      // Show the latest changelog entry
      setEntry(CHANGELOG[0]);
    }
  }, []);

  function handleClose() {
    localStorage.setItem(STORAGE_KEY, APP_VERSION);
    setEntry(null);
  }

  if (!entry) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 animate-fade-in" onClick={handleClose} />

      {/* Modal */}
      <div
        className="relative bg-[#1a1a1a] rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm max-h-[80vh] overflow-hidden animate-slide-up"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-xs">IronLog 更新</p>
              <h2 className="text-white text-xl font-bold">v{entry.version}</h2>
            </div>
            <span className="text-4xl">🎉</span>
          </div>
          <p className="text-amber-100/80 text-xs mt-1">{entry.date}</p>
        </div>

        {/* Changes */}
        <div className="px-5 py-4 max-h-[50vh] overflow-y-auto">
          <h3 className="text-white text-sm font-semibold mb-3">本次更新内容</h3>
          <ul className="space-y-2">
            {entry.changes.map((change, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-amber-400 mt-0.5 flex-shrink-0">✦</span>
                {change}
              </li>
            ))}
          </ul>
        </div>

        {/* Button */}
        <div className="px-5 pb-5 pt-2">
          <button
            onClick={handleClose}
            className="w-full bg-amber-500 text-black font-bold py-3 rounded-xl active:scale-[0.98] transition-transform"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  );
}
