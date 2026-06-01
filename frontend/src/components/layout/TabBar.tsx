import { useLocation, useNavigate } from 'react-router-dom';

const tabs = [
  { path: '/', icon: '🏠', label: '首页', activeIcon: '🏠' },
  { path: '/plans', icon: '📋', label: '计划', activeIcon: '📋' },
  { path: '/records', icon: '📊', label: '记录', activeIcon: '📊' },
  { path: '/calendar', icon: '📅', label: '日历', activeIcon: '📅' },
  { path: '/profile', icon: '👤', label: '我的', activeIcon: '👤' },
];

export default function TabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-[#0f0f0f]/95 backdrop-blur-lg border-t border-gray-800 z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex justify-around items-center h-14">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center justify-center flex-1 h-full py-1 active:opacity-70 transition-opacity"
            >
              <span className={`text-xl ${active ? 'scale-110' : ''} transition-transform`}>
                {tab.icon}
              </span>
              <span className={`text-xs mt-0.5 ${active ? 'text-amber-400 font-medium' : 'text-gray-500'}`}>
                {tab.label}
              </span>
              {active && (
                <div className="absolute top-0 w-8 h-0.5 bg-amber-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
