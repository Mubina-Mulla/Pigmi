// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import DailyReport from './pages/DailyReport';
import CustomersPage from './pages/Customers/CustomersPage';
import AgentsPage from './pages/Agents/AgentsPage';
import TransactionsPage from './pages/Transactions/TransactionsPage';
import PrivateRoute from './components/PrivateRoute';
import RootRedirect from './components/RootRedirect';
import AdminLayout from './layouts/AdminLayout';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Router>
          <div className="app-container">
            <Routes>
              {/* Root route - smart redirect based on auth state */}
              <Route path="/" element={<RootRedirect />} />
              
              {/* Login route - accessible to everyone */}
              <Route path="/adminlogin" element={<AdminLogin />} />
              
              {/* Protected Admin Dashboard route */}
              <Route
                path="/admindashboard"
                element={
                  <PrivateRoute role="admin">
                    <AdminLayout>
                      <AdminDashboard />
                    </AdminLayout>
                  </PrivateRoute>
                }
              />

              {/* Protected Customers route */}
              <Route
                path="/customers"
                element={
                  <PrivateRoute role="admin">
                    <AdminLayout>
                      <CustomersPage />
                    </AdminLayout>
                  </PrivateRoute>
                }
              />

              {/* Protected Agents route */}
              <Route
                path="/agents"
                element={
                  <PrivateRoute role="admin">
                    <AdminLayout>
                      <AgentsPage />
                    </AdminLayout>
                  </PrivateRoute>
                }
              />

              {/* Protected Transactions route */}
              <Route
                path="/transactions"
                element={
                  <PrivateRoute role="admin">
                    <AdminLayout>
                      <TransactionsPage />
                    </AdminLayout>
                  </PrivateRoute>
                }
              />
              
              {/* Protected Daily Report route */}
              <Route
                path="/daily-report"
                element={
                  <PrivateRoute role="admin">
                    <AdminLayout>
                      <DailyReport />
                    </AdminLayout>
                  </PrivateRoute>
                }
              />
              
              {/* 404 route for undefined paths */}
              <Route path="*" element={<Navigate to="/adminlogin" replace />} />
            </Routes>
          </div>
        </Router>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;