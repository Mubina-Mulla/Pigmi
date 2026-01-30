import React from 'react';
import { Navbar, Container, Nav, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Header.css';
import { FaPiggyBank, FaChartBar } from "react-icons/fa";
import { BsCalendarDate } from "react-icons/bs";

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };
  return (
    <Navbar className="header-navbar" variant="dark" expand="lg">
      <Container fluid>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto align-items-center">
            <Button
              variant="outline-light"
              className="logout-btn"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;
