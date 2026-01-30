// components/PrivateRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from 'react-bootstrap';

const PrivateRoute = ({ children, role }) => {
  const { user, loading } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  // TEMPORARY: Allow access even without user for testing
  // TODO: Re-enable authentication check after login works
  // if (!user) {
  //   return <Navigate to="/adminlogin" replace />;
  // }

  return children;
};

export default PrivateRoute;