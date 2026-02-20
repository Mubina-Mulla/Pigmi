import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Table,
  Card,
  Button,
  Badge,
  Form,
  InputGroup
} from "react-bootstrap";
import { ref, onValue } from "firebase/database";
import { database } from "../../firebase";
import { ArrowLeft, User, Phone, MapPin, TrendingUp, TrendingDown, DollarSign, Users, Download, Search } from "react-feather";
import "../../components/StatCards/StatCards.css";

function AgentDashboard() {
  const { agentName } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    // Fetch agent data
    const agentRef = ref(database, `agents/${agentName}`);
    onValue(agentRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setAgent({
          name: agentName,
          ...data
        });
      }
      setLoading(false);
    });

    // Fetch all customers for this agent
    const customersRef = ref(database, "customers");
    onValue(customersRef, (snapshot) => {
      const customerData = snapshot.val() || {};
      const agentCustomers = [];
      
      Object.entries(customerData).forEach(([id, customer]) => {
        if (customer && customer.agentName === agentName) {
          agentCustomers.push({
            id,
            accountNo: customer.accountNo || customer.accountNumber || id,
            ...customer
          });
        }
      });
      
      setCustomers(agentCustomers);
    });

    // Fetch all transactions for this agent's customers
    const transactionsRef = ref(database, "transactions");
    onValue(transactionsRef, (snapshot) => {
      const transactionData = snapshot.val() || {};
      const agentTransactions = [];
      
      // First, get list of customer account numbers for this agent
      const customersRefForTrans = ref(database, "customers");
      onValue(customersRefForTrans, (customerSnapshot) => {
        const customerData = customerSnapshot.val() || {};
        const agentCustomerAccounts = [];
        
        Object.entries(customerData).forEach(([id, customer]) => {
          if (customer && customer.agentName === agentName) {
            agentCustomerAccounts.push(customer.accountNo || customer.accountNumber || id);
          }
        });
        
        // Now filter transactions for these customers
        Object.entries(transactionData).forEach(([accountNo, accountTransactions]) => {
          if (agentCustomerAccounts.includes(accountNo)) {
            // Find customer name
            const customer = Object.values(customerData).find(c => 
              (c.accountNo === accountNo || c.accountNumber === accountNo)
            );
            
            if (accountTransactions && typeof accountTransactions === 'object') {
              Object.entries(accountTransactions).forEach(([transId, trans]) => {
                if (trans && typeof trans === 'object') {
                  agentTransactions.push({
                    id: transId,
                    accountNo: accountNo,
                    customerName: customer?.name || "Unknown",
                    ...trans
                  });
                }
              });
            }
          }
        });
        
        // Sort by timestamp descending
        agentTransactions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setTransactions(agentTransactions);
      });
    });
  }, [agentName]);

  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center">Loading...</div>
      </Container>
    );
  }

  if (!agent) {
    return (
      <Container className="py-4">
        <div className="text-center">Agent not found</div>
        <Button onClick={() => navigate("/agents")} className="mt-3">
          Back to Agents
        </Button>
      </Container>
    );
  }

  // Calculate statistics
  const totalDeposits = transactions
    .filter(t => (t.type === "deposit" || t.type === "DEPOSIT"))
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

  const totalWithdrawals = transactions
    .filter(t => (t.type === "withdrawal" || t.type === "WITHDRAWAL"))
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

  const netBalance = totalDeposits - totalWithdrawals;

  // Filter customers based on search
  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchTerm.toLowerCase();
    return (
      customer.accountNo?.toString().toLowerCase().includes(searchLower) ||
      customer.name?.toLowerCase().includes(searchLower) ||
      customer.mobileNumber?.toLowerCase().includes(searchLower) ||
      customer.mobile?.toLowerCase().includes(searchLower) ||
      customer.village?.toLowerCase().includes(searchLower) ||
      customer.address?.toLowerCase().includes(searchLower)
    );
  });

  // Filter transactions based on search
  const filteredTransactions = transactions.filter(trans => {
    const searchLower = searchTerm.toLowerCase();
    const date = trans.date || new Date(trans.timestamp || Date.now()).toLocaleDateString('en-IN');
    const time = trans.time || new Date(trans.timestamp || Date.now()).toLocaleTimeString('en-IN');
    return (
      trans.accountNo?.toString().toLowerCase().includes(searchLower) ||
      trans.customerName?.toLowerCase().includes(searchLower) ||
      trans.type?.toLowerCase().includes(searchLower) ||
      trans.mode?.toLowerCase().includes(searchLower) ||
      trans.note?.toLowerCase().includes(searchLower) ||
      date.toLowerCase().includes(searchLower) ||
      time.toLowerCase().includes(searchLower) ||
      trans.amount?.toString().includes(searchLower)
    );
  });

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Time,Account No,Customer Name,Type,Amount (₹),Mode,Note\n";
    
    transactions.forEach(trans => {
      const date = trans.date || new Date(trans.timestamp || Date.now()).toLocaleDateString('en-IN');
      const time = trans.time || new Date(trans.timestamp || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      const type = (trans.type || "DEPOSIT").toUpperCase();
      const amount = parseInt(trans.amount) || 0;
      const mode = (trans.mode || 'cash').toUpperCase();
      const note = trans.note || "-";
      
      csvContent += `${date},${time},${trans.accountNo},"${trans.customerName}",${type},${amount},${mode},"${note}"\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${agentName}_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 p-3 rounded" style={{ backgroundColor: '#e3f2fd' }}>
        <div>
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => navigate("/agents")}
          >
            <ArrowLeft size={16} className="me-1" />
            Back to Agents
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <Row className="mb-4 g-3">
        <Col xs={12} sm={6} md={3}>
          <Card className="border-0 shadow-sm stat-card">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-primary bg-opacity-10 rounded-circle p-3 me-3">
                  <Users size={24} className="text-primary" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Total Customers</h6>
                  <h4 className="fw-bold mb-0">{customers.length}</h4>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card className="border-0 shadow-sm stat-card">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-success bg-opacity-10 rounded-circle p-3 me-3">
                  <TrendingUp size={24} className="text-success" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Total Deposits</h6>
                  <h4 className="fw-bold mb-0">₹{totalDeposits.toLocaleString()}</h4>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card className="border-0 shadow-sm stat-card">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-danger bg-opacity-10 rounded-circle p-3 me-3">
                  <TrendingDown size={24} className="text-danger" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Total Withdrawn</h6>
                  <h4 className="fw-bold mb-0">₹{totalWithdrawals.toLocaleString()}</h4>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card className="border-0 shadow-sm stat-card">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-info bg-opacity-10 rounded-circle p-3 me-3">
                  <DollarSign size={24} className="text-info" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Net Balance</h6>
                  <h4 className="fw-bold mb-0">₹{netBalance.toLocaleString()}</h4>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Agent Details */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-light">
          <h5 className="mb-0">Agent Information</h5>
        </Card.Header>
        <Card.Body>
          <Row className="mb-3">
            <Col xs={12}>
              <h4 className="fw-bold mb-1">
                <User size={24} className="me-2" />
                {agent.name}
              </h4>
            </Col>
          </Row>
          <hr />
          <Row>
            <Col md={6}>
              <p className="d-flex align-items-center">
                <Phone size={18} className="me-2 text-primary" />
                <strong>Mobile:</strong>&nbsp;{agent.mobile}
              </p>
              <p className="d-flex align-items-center">
                <MapPin size={18} className="me-2 text-primary" />
                <strong>Address:</strong>&nbsp;{agent.address || "N/A"}
              </p>
            </Col>
            <Col md={6}>
              <p>
                <strong>Routes:</strong>&nbsp;
                {Array.isArray(agent.route) ? agent.route.join(', ') : (agent.route || "N/A")}
              </p>
              <p>
                <strong>Status:</strong>&nbsp;
                <Badge bg="success">Active</Badge>
              </p>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Global Search Bar */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <InputGroup>
            <InputGroup.Text className="bg-white">
              <Search size={18} />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search customers and transactions by name, account, mobile, village, date, amount, type, mode, or note..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ fontSize: '15px' }}
            />
          </InputGroup>
        </Card.Body>
      </Card>

      {/* Customers Table */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-light">
          <h5 className="mb-0">Customers ({filteredCustomers.length})</h5>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead className="bg-light">
                <tr>
                  <th>Account No</th>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Village</th>
                  <th>Total Deposits</th>
                  <th>Total Withdrawn</th>
                  <th>Balance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer) => {
                    const balance = (customer.totalAmount || 0) - (customer.withdrawnAmount || 0);
                    return (
                      <tr key={customer.id}>
                        <td>
                          <Badge bg="outline-primary" text="dark">
                            {customer.accountNo}
                          </Badge>
                        </td>
                        <td className="fw-semibold">{customer.name}</td>
                        <td>{customer.mobileNumber || customer.mobile}</td>
                        <td>{customer.village || "-"}</td>
                        <td className="text-success fw-bold">
                          ₹{(customer.totalAmount || 0).toLocaleString()}
                        </td>
                        <td className="text-danger fw-bold">
                          ₹{(customer.withdrawnAmount || 0).toLocaleString()}
                        </td>
                        <td className="text-primary fw-bold">
                          ₹{balance.toLocaleString()}
                        </td>
                        <td>
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => navigate(`/customers/${customer.accountNo}`)}
                          >
                            View Details
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center text-muted py-4">
                      {searchTerm ? "No customers match your search" : "No customers found for this agent"}
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Transactions Table */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-light d-flex justify-content-between align-items-center">
          <h5 className="mb-0">All Transactions ({filteredTransactions.length})</h5>
          <Button
            size="sm"
            onClick={exportToCSV}
            style={{ backgroundColor: 'rgb(238,95,14)', border: 'none', color: 'white' }}
            disabled={transactions.length === 0}
          >
            <Download size={14} className="me-1" />
            Export CSV
          </Button>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead className="bg-light">
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Account No</th>
                  <th>Customer Name</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Mode</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((trans, index) => {
                    const date = trans.date || new Date(trans.timestamp || Date.now()).toLocaleDateString('en-IN');
                    const time = trans.time || new Date(trans.timestamp || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                    const type = (trans.type || "DEPOSIT").toUpperCase();
                    const isDeposit = type === "DEPOSIT";

                    return (
                      <tr key={trans.id || index}>
                        <td>{date}</td>
                        <td className="text-muted"><small>{time}</small></td>
                        <td>
                          <Badge bg="outline-primary" text="dark">
                            {trans.accountNo}
                          </Badge>
                        </td>
                        <td className="fw-semibold">{trans.customerName}</td>
                        <td>
                          <Badge bg={isDeposit ? "success" : "danger"}>
                            {type}
                          </Badge>
                        </td>
                        <td className={`fw-bold ${isDeposit ? 'text-success' : 'text-danger'}`}>
                          {isDeposit ? "+" : "-"}₹{(parseInt(trans.amount) || 0).toLocaleString()}
                        </td>
                        <td>
                          <Badge bg="secondary">
                            {(trans.mode || 'cash').toUpperCase()}
                          </Badge>
                        </td>
                        <td>{trans.note || "-"}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center text-muted py-4">
                      {searchTerm ? "No transactions match your search" : "No transactions found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default AgentDashboard;
