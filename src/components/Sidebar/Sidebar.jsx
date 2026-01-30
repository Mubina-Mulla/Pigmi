import React, { useState, useEffect } from 'react';
import { Nav } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaUsers, FaUserTie, FaMoneyBillWave, FaTachometerAlt, FaSignOutAlt, FaBars, FaTimes } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Toggle body class for button positioning
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
    return () => {
      document.body.classList.remove('sidebar-open');
    };
  }, [isOpen]);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <FaTachometerAlt size={20} />,
      path: '/admindashboard'
    },
    {
      id: 'customers',
      label: 'All Customers',
      icon: <FaUsers size={20} />,
      path: '/customers'
    },
    {
      id: 'agents',
      label: 'Agent Management',
      icon: <FaUserTie size={20} />,
      path: '/agents'
    },
    {
      id: 'transactions',
      label: 'All Transactions',
      icon: <FaMoneyBillWave size={20} />,
      path: '/transactions'
    }
  ];

  const handleNavigation = (item) => {
    navigate(item.path);
  };

  const isActive = (item) => {
    return location.pathname === item.path;
  };

  return (
    <>
      {/* Mobile Menu Toggle - Only show when sidebar is closed */}
      {!isOpen && (
        <button className="mobile-menu-toggle" onClick={toggleSidebar}>
          <FaBars size={24} />
        </button>
      )}

      {/* Overlay for mobile */}
      {isOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

      <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
        {/* Close button inside sidebar */}
        <button className="sidebar-close-btn" onClick={toggleSidebar}>
          <FaTimes size={24} />
        </button>
        
        <div className="sidebar-brand">
        <h4 className="mb-0">Pigmi <span>Admin</span></h4>
        <small className="text-muted">Management System</small>
      </div>

      <Nav className="flex-column sidebar-menu">
        {menuItems.map((item) => (
          <Nav.Item key={item.id} className="sidebar-menu-item">
            <button
              className={`sidebar-link ${isActive(item) ? 'active' : ''}`}
              onClick={() => handleNavigation(item)}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-label">{item.label}</span>
            </button>
          </Nav.Item>
        ))}
      </Nav>

      <Nav className="flex-column mt-auto">
        <Nav.Item className="sidebar-menu-item">
          <button
            className="sidebar-link logout-link"
            onClick={handleLogout}
          >
            <span className="sidebar-icon"><FaSignOutAlt size={20} /></span>
            <span className="sidebar-label">Logout</span>
          </button>
        </Nav.Item>
      </Nav>

      <div className="sidebar-footer">
        <small className="text-muted">© 2026 Pigmi System</small>
      </div>
    </aside>
    </>
  );
};

export default Sidebar;
