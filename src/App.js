// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import DailyReport from './pages/DailyReport';
import CustomersPage from './pages/Customers/CustomersPage';
import CustomerDashboard from './pages/Customers/CustomerDashboard';
import AgentsPage from './pages/Agents/AgentsPage';
import AgentDashboard from './pages/Agents/AgentDashboard';
import RoutesPage from './pages/Routes/RoutesPage';
import TransactionsPage from './pages/Transactions/TransactionsPage';
import RecycleBinPage from './pages/RecycleBin/RecycleBinPage';
import PrivateRoute from './components/PrivateRoute';
import RootRedirect from './components/RootRedirect';
import AdminLayout from './layouts/AdminLayout';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Router>
          <div className="app-container">
            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop={true}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
              style={{
                top: '70px',
                right: '20px',
                zIndex: 9999
              }}
              toastStyle={{
                backgroundColor: '#ffffff',
                color: '#333333',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                borderRadius: '8px',
                padding: '16px',
                fontSize: '14px',
                fontWeight: '500'
              }}
            />
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

              {/* Protected Customer Dashboard route */}
              <Route
                path="/customers/:accountNo"
                element={
                  <PrivateRoute role="admin">
                    <AdminLayout>
                      <CustomerDashboard />
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

              {/* Protected Agent Dashboard route */}
              <Route
                path="/agents/:agentName"
                element={
                  <PrivateRoute role="admin">
                    <AdminLayout>
                      <AgentDashboard />
                    </AdminLayout>
                  </PrivateRoute>
                }
              />

              {/* Protected Routes Management route */}
              <Route
                path="/routes"
                element={
                  <PrivateRoute role="admin">
                    <AdminLayout>
                      <RoutesPage />
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
              
              {/* Protected Recycle Bin route */}
              <Route
                path="/recyclebin"
                element={
                  <PrivateRoute role="admin">
                    <AdminLayout>
                      <RecycleBinPage />
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