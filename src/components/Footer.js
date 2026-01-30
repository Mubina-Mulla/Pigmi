import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <Container>
        <div className="advertisement-banner">
          <Row className="align-items-center">
            <Col md={8}>
              <h4 className="ad-title">🎉 Special Offer for Pigmi Customers!</h4>
              <p className="ad-text">
                Join today and get <strong>0% interest</strong> for the first 3 months. 
                Secure your savings with our trusted Pigmi service.
              </p>
            </Col>
            <Col md={4} className="text-end">
              <button className="ad-btn">Learn More →</button>
            </Col>
          </Row>
        </div>
        
        <Row className="footer-content">
          <Col md={4} className="footer-section">
            <h5>About Pigmi</h5>
            <p>
              Your trusted partner for daily savings collection and financial management.
              Safe, secure, and reliable.
            </p>
          </Col>
          <Col md={4} className="footer-section">
            <h5>Quick Links</h5>
            <ul className="footer-links">
              <li><a href="#privacy">Privacy Policy</a></li>
              <li><a href="#terms">Terms & Conditions</a></li>
              <li><a href="#contact">Contact Us</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
          </Col>
          <Col md={4} className="footer-section">
            <h5>Contact Info</h5>
            <ul className="contact-info">
              <li>📞 +91 9876543210</li>
              <li>✉️ support@pigmi.com</li>
              <li>📍 Mumbai, Maharashtra</li>
            </ul>
          </Col>
        </Row>
        
        <div className="footer-bottom">
          <p>&copy; 2024 Pigmi Management System. All rights reserved.</p>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
