import React, { useState, useEffect } from "react";
import { Container, Table, Card, Badge, Form, InputGroup } from "react-bootstrap";
import { ref, onValue, set } from "firebase/database";
import { Search } from "react-feather";
import { database } from "../firebase";
import StatCards from "../components/StatCards/StatCards";
import { Spinner } from "react-bootstrap";

function AdminDashboard() {
  const [customers, setCustomers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('customers'); // Track which card is active
  const [searchTerm, setSearchTerm] = useState(''); // Search functionality

  // Calculate interest based on time elapsed
  const calculateTimeBasedInterest = (balance, createdDate) => {
    if (!createdDate) return { rate: 0, amount: 0 };
    
    const created = new Date(Number(createdDate));
    const now = new Date();
    const monthsElapsed = (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth());
    
    let interestRate = 0;
    
    if (monthsElapsed >= 12) {
      interestRate = 7; // 7% after 12 months
    } else if (monthsElapsed >= 6) {
      interestRate = 3.5; // 3.5% after 6 months
    }
    
    const interestAmount = (balance * interestRate) / 100;
    return { rate: interestRate, amount: interestAmount };
  };

  // Calculate stats
  const totalCustomers = customers.length;
  const totalAmount = customers.reduce((sum, c) => sum + (Number(c.depositAmount) || 0), 0);
  const totalWithdrawn = customers.reduce((sum, c) => sum + (Number(c.withdrawnAmount) || 0), 0);
  const netAmount = totalAmount - totalWithdrawn;

  // Fetch customers and transactions data from Firebase
  useEffect(() => {
    const customersRef = ref(database, "customers");
    const transactionsRef = ref(database, "transactions");
    
    const unsubscribeCustomers = onValue(customersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const customerList = [];
      
      Object.entries(data).forEach(([id, customer]) => {
        if (customer && typeof customer === 'object') {
          // Normalize mobile number field
          const mobile = customer.mobile || customer.mobileNumber || customer.phone || '';
          
          // Normalize deposit amount field
          const depositAmount = Number(customer.depositAmount || customer.totalAmount || customer.balance || 0);
          const withdrawnAmount = Number(customer.withdrawnAmount || customer.withdrawn || 0);
          
          customerList.push({
            id,
            accountNo: customer.accountNo || id,
            ...customer,
            mobile: mobile,
            depositAmount: depositAmount,
            withdrawnAmount: withdrawnAmount,
            createdDateTimestamp: customer.createdDate || Date.now()
          });
        }
      });
      
      setCustomers(customerList);
      setLoading(false);
    });

    const unsubscribeTransactions = onValue(transactionsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const transactionList = [];
      
      Object.entries(data).forEach(([uid, uidData]) => {
        if (uidData && typeof uidData === 'object') {
          if (uidData.type || uidData.amount) {
            transactionList.push({ id: uid, ...uidData });
          } else {
            Object.entries(uidData).forEach(([subId, subTransaction]) => {
              if (subTransaction && typeof subTransaction === 'object') {
                transactionList.push({ id: subId, uid, ...subTransaction });
              }
            });
          }
        }
      });
      
      setTransactions(transactionList);
    });

    return () => {
      unsubscribeCustomers();
      unsubscribeTransactions();
    };
  }, []);

  // Function to save interest data to Firebase
  // eslint-disable-next-line no-unused-vars
  const saveInterestToFirebase = async (customer, availableBalance, interest6Months, interest12Months) => {
    try {
      const interestRef = ref(database, `interest/${customer.accountNo}`);
      const interestData = {
        customerId: customer.id,
        customerName: customer.name,
        accountNo: customer.accountNo,
        availableBalance: Number(availableBalance.toFixed(2)),
        interest6Months: {
          percentage: 3.5,
          amount: Number(interest6Months.toFixed(2)),
          totalReturn: Number((availableBalance + interest6Months).toFixed(2))
        },
        interest12Months: {
          percentage: 7,
          amount: Number(interest12Months.toFixed(2)),
          totalReturn: Number((availableBalance + interest12Months).toFixed(2))
        },
        calculatedAt: new Date().toISOString(),
        timestamp: Date.now()
      };
      
      await set(interestRef, interestData);
      alert(`Interest data saved successfully for ${customer.name}!`);
    } catch (error) {
      console.error("Error saving interest data:", error);
      alert("Failed to save interest data. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light">
        <div className="text-center">
          <Spinner animation="border" variant="primary" style={{width: "3rem", height: "3rem"}} />
          <p className="mt-3 text-muted">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container bg-light">
      <Container fluid className="py-4">
        <StatCards 
          totalCustomers={totalCustomers}
          totalAmount={totalAmount}
          totalWithdrawn={totalWithdrawn}
          netAmount={netAmount}
          onCardClick={(cardId) => setActiveView(cardId)}
        />

        {/* Customer List */}
        {activeView === 'customers' && (
          <Card className="mt-4 shadow-sm">
            <Card.Header className="bg-white border-bottom">
              <h5 className="mb-3 text-center">All Customers ({totalCustomers})</h5>
              <div className="d-flex justify-content-center">
                <InputGroup style={{ maxWidth: '500px' }}>
                  <InputGroup.Text className="bg-light border-end-0">
                    <Search size={18} className="text-muted" />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Search by name, mobile, account no, or agent..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border-start-0"
                  />
                </InputGroup>
              </div>
          </Card.Header>
          <Card.Body className="p-0">
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <Table bordered hover responsive className="mb-0">
                <thead className="bg-light sticky-top">
                  <tr>
                    <th>Account No</th>
                    <th>Name</th>
                    <th>Mobile</th>
                    <th>Agent</th>
                    <th>Route</th>
                    <th>Deposit Amount</th>
                    <th>Withdrawn Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.filter(customer => {
                    const search = searchTerm.toLowerCase();
                    return customer.name?.toLowerCase().includes(search) ||
                           customer.mobile?.includes(search) ||
                           customer.accountNo?.toLowerCase().includes(search) ||
                           customer.agentName?.toLowerCase().includes(search);
                  }).map((customer, index) => {
                    const balance = Number(customer.depositAmount || 0) - Number(customer.withdrawnAmount || 0);
                    const { amount: interestAmount } = calculateTimeBasedInterest(balance, customer.createdDateTimestamp);
                    
                    // Calculate months elapsed
                    // const created = new Date(Number(customer.createdDateTimestamp));
                    // const now = new Date();
                    // const monthsElapsed = (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth());
                    
                    return (
                      <tr key={customer.id}>
                        <td><strong>{customer.accountNo}</strong></td>
                        <td>{customer.name}</td>
                        <td>{customer.mobile || customer.mobileNumber || customer.phone || 'N/A'}</td>
                        <td>{customer.agentName || 'N/A'}</td>
                        <td>{customer.route || 'N/A'}</td>
                        <td className="text-success">₹{Number(customer.depositAmount || 0).toLocaleString()}</td>
                        <td className="text-danger">₹{Number(customer.withdrawnAmount || 0).toLocaleString()}</td>
                        <td>
                          <Badge bg="success">
                            Active
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
        )}

        {/* Deposits List */}
        {activeView === 'deposits' && (
          <Card className="mt-4 shadow-sm">
          <Card.Header className="bg-white border-bottom">
            <h5 className="mb-3 text-center">All Deposits - Total: ₹{totalAmount.toLocaleString()}</h5>
            <div className="d-flex justify-content-center">
              <InputGroup style={{ maxWidth: '500px' }}>
                <InputGroup.Text className="bg-light border-end-0">
                  <Search size={18} className="text-muted" />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search by customer name or transaction ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-start-0"
                />
              </InputGroup>
            </div>
          </Card.Header>
          <Card.Body className="p-0">
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <Table bordered hover responsive className="mb-0">
                <thead className="bg-light sticky-top">
                  <tr>
                    <th>Transaction ID</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.filter(t => (t.type || '').toLowerCase() === 'deposit').filter(transaction => {
                    const customer = customers.find(c => c.accountNo === transaction.uid || c.id === transaction.uid);
                    const search = searchTerm.toLowerCase();
                    return customer?.name?.toLowerCase().includes(search) ||
                           transaction.id?.toLowerCase().includes(search);
                  }).length > 0 ? (
                    transactions.filter(t => (t.type || '').toLowerCase() === 'deposit').filter(transaction => {
                      const customer = customers.find(c => c.accountNo === transaction.uid || c.id === transaction.uid);
                      const search = searchTerm.toLowerCase();
                      return customer?.name?.toLowerCase().includes(search) ||
                             transaction.id?.toLowerCase().includes(search);
                    }).map((transaction, index) => {
                      const customer = customers.find(c => c.accountNo === transaction.uid || c.id === transaction.uid);
                      return (
                        <tr key={transaction.id}>
                          <td><small>{transaction.id}</small></td>
                          <td>{customer?.name || 'Unknown'}</td>
                          <td className="text-success"><strong>₹{Number(transaction.amount || 0).toLocaleString()}</strong></td>
                          <td>{new Date(transaction.timestamp || transaction.date).toLocaleString()}</td>
                          <td><Badge bg="info">{transaction.mode || 'cash'}</Badge></td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center text-muted py-4">
                        No deposit transactions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
        )}

        {/* Withdrawals List */}
        {activeView === 'withdrawn' && (
          <Card className="mt-4 shadow-sm">
          <Card.Header className="bg-white border-bottom">
            <h5 className="mb-3 text-center">All Withdrawals - Total: ₹{totalWithdrawn.toLocaleString()}</h5>
            <div className="d-flex justify-content-center">
              <InputGroup style={{ maxWidth: '500px' }}>
                <InputGroup.Text className="bg-light border-end-0">
                  <Search size={18} className="text-muted" />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search by customer name or transaction ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-start-0"
                />
              </InputGroup>
            </div>
          </Card.Header>
          <Card.Body className="p-0">
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <Table bordered hover responsive className="mb-0">
                <thead className="bg-light sticky-top">
                  <tr>
                    <th>Transaction ID</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.filter(t => (t.type || '').toLowerCase() === 'withdrawal').filter(transaction => {
                    const customer = customers.find(c => c.accountNo === transaction.uid || c.id === transaction.uid);
                    const search = searchTerm.toLowerCase();
                    return customer?.name?.toLowerCase().includes(search) ||
                           transaction.id?.toLowerCase().includes(search);
                  }).length > 0 ? (
                    transactions.filter(t => (t.type || '').toLowerCase() === 'withdrawal').filter(transaction => {
                      const customer = customers.find(c => c.accountNo === transaction.uid || c.id === transaction.uid);
                      const search = searchTerm.toLowerCase();
                      return customer?.name?.toLowerCase().includes(search) ||
                             transaction.id?.toLowerCase().includes(search);
                    }).map((transaction, index) => {
                      const customer = customers.find(c => c.accountNo === transaction.uid || c.id === transaction.uid);
                      return (
                        <tr key={transaction.id}>
                          <td><small>{transaction.id}</small></td>
                          <td>{customer?.name || 'Unknown'}</td>
                          <td className="text-danger"><strong>₹{Number(transaction.amount || 0).toLocaleString()}</strong></td>
                          <td>{new Date(transaction.timestamp || transaction.date).toLocaleString()}</td>
                          <td><Badge bg="warning">{transaction.mode || 'cash'}</Badge></td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center text-muted py-4">
                        No withdrawal transactions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
        )}

        {/* Net Balance View */}
        {activeView === 'balance' && (
          <Card className="mt-4 shadow-sm">
          <Card.Header className="bg-white border-bottom">
            <h5 className="mb-3 text-center">Customer Balances - Net Balance: ₹{netAmount.toLocaleString()}</h5>
            <div className="d-flex justify-content-center">
              <InputGroup style={{ maxWidth: '500px' }}>
                <InputGroup.Text className="bg-light border-end-0">
                  <Search size={18} className="text-muted" />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search by customer name or account no..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-start-0"
                />
              </InputGroup>
            </div>
          </Card.Header>
          <Card.Body className="p-0">
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <Table bordered hover responsive className="mb-0">
                <thead className="bg-light sticky-top">
                  <tr>
                    <th>Account No</th>
                    <th>Customer Name</th>
                    <th>Total Deposits</th>
                    <th>Total Withdrawals</th>
                    <th>Current Balance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.filter(customer => {
                    const search = searchTerm.toLowerCase();
                    return customer.name?.toLowerCase().includes(search) ||
                           customer.accountNo?.toLowerCase().includes(search);
                  }).map((customer, index) => {
                    const balance = Number(customer.depositAmount || 0) - Number(customer.withdrawnAmount || 0);
                    return (
                      <tr key={customer.id}>
                        <td><strong>{customer.accountNo}</strong></td>
                        <td>{customer.name}</td>
                        <td className="text-success">₹{Number(customer.depositAmount || 0).toLocaleString()}</td>
                        <td className="text-danger">₹{Number(customer.withdrawnAmount || 0).toLocaleString()}</td>
                        <td className="text-info"><strong>₹{balance.toLocaleString()}</strong></td>
                        <td>
                          <Badge bg="success">
                            Active
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
        )}
      </Container>
    </div>
  );
}

export default AdminDashboard;
