import {
  useEffect,
  useState,
} from 'react';

import {
  Outlet,
  useLocation,
} from 'react-router-dom';

import GlobalChatWidget from '../components/chat/GlobalChatWidget.jsx';
import Sidebar from '../components/layout/Sidebar.jsx';
import Topbar from '../components/layout/Topbar.jsx';
import MobileNav from '../components/layout/MobileNav.jsx';
import IdleBrandOverlay from '../components/layout/IdleBrandOverlay.jsx';

const DashboardLayout = () => {
  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);

  const location =
    useLocation();

  // Mobilde route değişince menüyü kapat.
  useEffect(() => {
    setSidebarOpen(false);
  }, [
    location.pathname,
  ]);

  // Mobil sidebar açıkken body scroll'unu kilitle.
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow =
        'hidden';
    } else {
      document.body.style.overflow =
        '';
    }

    return () => {
      document.body.style.overflow =
        '';
    };
  }, [
    sidebarOpen,
  ]);

  return (
    <IdleBrandOverlay>
      <div
        className="
          min-h-screen
          bg-[#f6f8fb]
          text-gray-900
          dark:bg-[#071426]
          dark:text-white
        "
      >
        {/* SIDEBAR */}
        <Sidebar
          open={sidebarOpen}
          onClose={() =>
            setSidebarOpen(false)
          }
        />

        {/* CONTENT AREA */}
        <div
          className="
            min-h-screen
            lg:ml-64
          "
        >
          <div className="flex min-h-screen flex-col">
            {/* TOPBAR */}
            <Topbar
              onMenuClick={() =>
                setSidebarOpen(true)
              }
            />

            {/* PAGE CONTENT */}
            <main
              className="
                flex-1
                overflow-x-hidden
                px-3
                py-4
                pb-24
                sm:px-4
                md:px-6
                md:py-6
                lg:pb-8
                xl:px-8
              "
            >
              <div
                className="
                  mx-auto
                  w-full
                  max-w-[1600px]
                "
              >
                <Outlet />
              </div>
            </main>

            {/* MOBILE NAV */}
            <MobileNav />
          </div>
        </div>

        {/* GLOBAL CHAT */}
        <GlobalChatWidget />
      </div>
    </IdleBrandOverlay>
  );
};

export default DashboardLayout;
