import {
  Outlet,
} from 'react-router-dom';

const BlankLayout = () => {
  return (
    <div
      className="
        min-h-screen
        bg-[#f6f8fb]
        text-gray-900
        dark:bg-[#071426]
        dark:text-white
      "
    >
      <main className="min-h-screen">
        <Outlet />
      </main>
    </div>
  );
};

export default BlankLayout;