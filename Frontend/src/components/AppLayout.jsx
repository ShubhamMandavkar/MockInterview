import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';

const AppLayout = () => {
  const location = useLocation();
  
  // Pages where navbar should be hidden (full-focus pages)
  const hideNavbarPaths = [
    '/sessions/', // Live interview sessions
    '/interview-session/', // Alternative session path
  ];
  
  // Check if current path should hide navbar
  const shouldHideNavbar = hideNavbarPaths.some(path => 
    location.pathname.startsWith(path)
  );

  return (
    <div className="app-layout">
      {!shouldHideNavbar && <Navbar />}
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;