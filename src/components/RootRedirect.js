// components/RootRedirect.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from 'react-bootstrap';

const RootRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return user ? <Navigate to="/admindashboard" replace /> : <Navigate to="/adminlogin" replace />;
};

export default RootRedirect;
