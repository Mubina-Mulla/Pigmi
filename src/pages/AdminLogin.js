// src/pages/AdminLogin.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Alert, Button } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { loginAdmin, user } = useAuth();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user) {
      navigate("/admindashboard", { replace: true });
    }
  }, [user, navigate]);

  // 🔐 Handle Admin Login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    try {
      setLoading(true);
      await loginAdmin(email, password);
      navigate("/admindashboard");
    } catch (err) {
      console.error("Login Error:", err);
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Top Left Text */}
      <div style={{ 
        position: 'absolute', 
        top: '30px', 
        left: '30px', 
        zIndex: 10,
        color: 'white'
      }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0 }}>Welcome Back!</h1>
        <p style={{ fontSize: '16px', margin: 0, opacity: 0.9 }}>Manage your Pigmi business efficiently</p>
      </div>
      
      <div className="login-wrapper">
        {/* Left Side - Image/Background */}
        <div className="login-image-section">
          <div className="login-image-overlay">
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="login-form-section">
          <div className="login-header-simple">
            <h2>👨‍💼 Admin Login</h2>
            <p>Enter your details to access the portal</p>
          </div>

          {error && <Alert variant="danger">{error}</Alert>}

          <Form onSubmit={handleSubmit}>
            {/* EMAIL */}
            <Form.Group className="form-group mb-4">
              <Form.Label className="form-label">Email Address</Form.Label>
              <Form.Control
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </Form.Group>

            {/* PASSWORD */}
            <Form.Group className="form-group mb-4">
              <Form.Label className="form-label">Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </Form.Group>

            <Button
              type="submit"
              className="btn-login w-100"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
          </Form>
          
          <div className="login-footer-simple">
            <p>Protected by Pigmi Management System</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
