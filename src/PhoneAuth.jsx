import React, { useState } from "react";
import { auth } from "./firebase";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from "react-bootstrap";
import "./PhoneAuth.css";

export default function PhoneAuth() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const navigate = useNavigate();

  const setUpRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        "recaptcha-container",
        {
          size: "invisible",
          callback: () => console.log("Recaptcha verified"),
          "expired-callback": () => {
            console.log("Recaptcha expired");
          }
        },
        auth
      );
    }
  };

  const formatPhoneNumber = (phone) => {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Add +91 if not present and number starts with valid Indian digits
    if (cleaned.length === 10 && (cleaned.startsWith('6') || cleaned.startsWith('7') || cleaned.startsWith('8') || cleaned.startsWith('9'))) {
      return '+91' + cleaned;
    } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return '+' + cleaned;
    } else if (phone.startsWith('+91') && cleaned.length === 12) {
      return phone;
    }
    return phone;
  };

  const sendOtp = async () => {
    if (!phoneNumber.trim()) {
      setMessage("कृपया mobile number enter करें");
      setMessageType("danger");
      return;
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    setLoading(true);
    setMessage("");

    try {
      setUpRecaptcha();
      const appVerifier = window.recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(result);
      setOtpSent(true);
      setMessage("OTP आपके mobile number पर भेजा गया है!");
      setMessageType("success");
    } catch (error) {
      console.error("SMS not sent:", error);
      setMessage("OTP भेजने में समस्या: " + error.message);
      setMessageType("danger");
      
      // Reset recaptcha on error
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp.trim()) {
      setMessage("कृपया OTP enter करें");
      setMessageType("danger");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const result = await confirmationResult.confirm(otp);
      const user = result.user;
      
      setMessage("सफलतापूर्वक login हो गए!");
      setMessageType("success");
      
      // Store user info in localStorage
      localStorage.setItem('user', JSON.stringify({
        uid: user.uid,
        phoneNumber: user.phoneNumber,
        loginTime: new Date().toISOString()
      }));

      // Navigate to dashboard after successful login
      setTimeout(() => {
        navigate('/agent-dashboard');
      }, 1500);

    } catch (error) {
      console.error("OTP verification failed:", error);
      setMessage("गलत OTP। कृपया दोबारा try करें।");
      setMessageType("danger");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPhoneNumber("");
    setOtp("");
    setConfirmationResult(null);
    setOtpSent(false);
    setMessage("");
    setMessageType("");
    
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }
  };

  return (
    <div className="pigmi-auth-page">
      <Container className="mt-5">
        <Row className="justify-content-center">
          <Col md={6} lg={4}>
            <Card className="pigmi-auth-card shadow-lg">
              <Card.Header className="pigmi-auth-header text-center">
                <div className="pigmi-logo-small">
                  <span className="logo-icon">🏛️</span>
                  <span className="logo-text">PIGMI</span>
                </div>
                <h4>📱 Phone Authentication</h4>
                <p className="mb-0">OTP से Login करें</p>
              </Card.Header>
            <Card.Body>
              {message && (
                <Alert variant={messageType} className="mb-3">
                  {message}
                </Alert>
              )}

              {!otpSent ? (
                <Form>
                  <Form.Group className="mb-3">
                    <Form.Label>Mobile Number</Form.Label>
                    <Form.Control
                      type="tel"
                      placeholder="+91 XXXXX XXXXX"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      disabled={loading}
                    />
                    <Form.Text className="text-muted">
                      10 digit mobile number enter करें
                    </Form.Text>
                  </Form.Group>

                  <div className="d-grid">
                    <Button 
                      variant="primary" 
                      onClick={sendOtp}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          OTP भेजा जा रहा है...
                        </>
                      ) : (
                        "OTP भेजें"
                      )}
                    </Button>
                  </div>
                </Form>
              ) : (
                <Form>
                  <Form.Group className="mb-3">
                    <Form.Label>OTP Code</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="6 digit OTP enter करें"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      disabled={loading}
                      maxLength={6}
                    />
                    <Form.Text className="text-muted">
                      {formatPhoneNumber(phoneNumber)} पर भेजा गया OTP enter करें
                    </Form.Text>
                  </Form.Group>

                  <div className="d-grid gap-2">
                    <Button 
                      variant="success" 
                      onClick={verifyOtp}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Verify कर रहे हैं...
                        </>
                      ) : (
                        "OTP Verify करें"
                      )}
                    </Button>
                    
                    <Button 
                      variant="outline-secondary" 
                      onClick={resetForm}
                      disabled={loading}
                    >
                      दूसरा Number Use करें
                    </Button>
                  </div>
                </Form>
              )}

              <div id="recaptcha-container"></div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
    </div>
  );
}
