import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar/Sidebar';
import './AdminLayout.css';

const AdminLayout = ({ children }) => {
  const location = useLocation();
  const [displayContent, setDisplayContent] = useState(children);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // Trigger transition animation on route change
    setIsTransitioning(true);
    
    // Small delay to ensure smooth transition
    const timer = setTimeout(() => {
      setDisplayContent(children);
      setIsTransitioning(false);
    }, 50);

    return () => clearTimeout(timer);
  }, [location.pathname, children]);

  return (
    <div className="admin-layout">
      <Sidebar />
      <div className="admin-main-wrapper">
        <main className="admin-content" key={location.pathname}>
          {displayContent}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
