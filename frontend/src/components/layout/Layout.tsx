import { Outlet, useLocation } from 'react-router-dom';
import TabBar from './TabBar';

// Pages that don't show the tab bar
const hideTabBarRoutes = ['/training'];

export default function Layout() {
  const location = useLocation();
  const showTabBar = !hideTabBarRoutes.some((r) => location.pathname.startsWith(r));

  return (
    <div className="h-full flex flex-col bg-[#0f0f0f]">
      <main
        className="flex-1 overflow-hidden"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: showTabBar ? 'calc(56px + env(safe-area-inset-bottom, 0px))' : '0px',
        }}
      >
        <div className="h-full overflow-y-auto scroll-area">
          <Outlet />
        </div>
      </main>
      {showTabBar && <TabBar />}
    </div>
  );
}
