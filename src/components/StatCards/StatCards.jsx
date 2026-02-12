import React from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import { Users, TrendingUp, TrendingDown, DollarSign } from 'react-feather';
import './StatCards.css';

const StatCards = ({ totalCustomers, totalAmount, totalWithdrawn, netAmount, onCardClick }) => {
  const stats = [
    {
      id: 'customers',
      title: 'Total Customers',
      value: totalCustomers,
      icon: <Users size={24} className="text-primary" />,
      bgClass: 'bg-primary',
      valuePrefix: ''
    },
    {
      id: 'deposits',
      title: 'Total Deposits',
      value: totalAmount,
      icon: <TrendingUp size={24} className="text-success" />,
      bgClass: 'bg-success',
      valuePrefix: '₹'
    },
    {
      id: 'withdrawn',
      title: 'Total Withdrawn',
      value: totalWithdrawn,
      icon: <TrendingDown size={24} className="text-danger" />,
      bgClass: 'bg-danger',
      valuePrefix: '₹'
    },
    {
      id: 'balance',
      title: 'Net Balance',
      value: netAmount,
      icon: <span style={{ fontSize: '24px', fontWeight: 'bold' }} className="text-info">₹</span>,
      bgClass: 'bg-info',
      valuePrefix: '₹'
    }
  ];

  return (
    <Row className="mb-4 g-3">
      {stats.map((stat) => (
        <Col xs={12} sm={6} md={3} key={stat.id}>
          <Card 
            className="stat-card h-100 border-0 shadow-sm" 
            style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
            onClick={() => onCardClick && onCardClick(stat.id)}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Card.Body className="p-3">
              <div className="d-flex align-items-center">
                <div className={`stat-icon ${stat.bgClass} bg-opacity-10 rounded-circle p-3 me-3`}>
                  {stat.icon}
                </div>
                <div>
                  <h6 className="card-title text-muted mb-1">{stat.title}</h6>
                  <h3 className="fw-bold text-dark mb-0">
                    {stat.valuePrefix}{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                  </h3>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default StatCards;
