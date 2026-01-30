import React from 'react';
import Sidebar from '../components/Sidebar/Sidebar';
import './AdminLayout.css';

const AdminLayout = ({ children }) => {
  return (
    <div className="admin-layout">
      <Sidebar />
      <div className="admin-main-wrapper">
        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
