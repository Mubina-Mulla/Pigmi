import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Table,
  Card,
  Form,
  Button,
  Badge,
  InputGroup
} from "react-bootstrap";
import { ref, onValue } from "firebase/database";
import { database } from "../../firebase";
import {
  Search,
  Filter,
  Download,
  DollarSign
} from "react-feather";

function TransactionsPage() {
  const [customers, setCustomers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoute, setSelectedRoute] = useState("All Routes");
  const [selectedAgent, setSelectedAgent] = useState("All Agents");
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    const customersRef = ref(database, "customers");
    const agentsRef = ref(database, "agents");
    const transactionsRef = ref(database, "transactions");

    let customerListCache = [];

    // Fetch agents
    onValue(agentsRef, (snapshot) => {
      const agentData = snapshot.val() || {};
      const agentList = [];
      Object.entries(agentData).forEach(([agentName, agentInfo]) => {
        if (agentInfo) {
          agentList.push({
            name: agentName,
            mobile: agentInfo.mobile || "",
            route: Array.isArray(agentInfo.route) ? agentInfo.route : (agentInfo.route ? [agentInfo.route] : []),
          });
        }
      });
      setAgents(agentList);
    });

    onValue(customersRef, (snapshot) => {
      const customerData = snapshot.val() || {};
      const customerList = [];
      Object.entries(customerData).forEach(([customerId, customerInfo]) => {
        if (customerInfo && typeof customerInfo === 'object') {
          customerList.push({
            id: customerId,
            accountNo: customerInfo.accountNo || customerId,
            name: customerInfo.name || "Unknown",
            agentName: customerInfo.agentName || "",
            route: customerInfo.route || ""
          });
        }
      });
      customerListCache = customerList;
      setCustomers(customerList);
    });

    onValue(transactionsRef, (snapshot) => {
      const transactionData = snapshot.val() || {};
      const transactionList = [];
      
      Object.entries(transactionData).forEach(([uid, uidData]) => {
        if (uidData && typeof uidData === 'object') {
          if (uidData.type || uidData.amount) {
            const customer = customerListCache.find(c => c.accountNo === uid);
            transactionList.push({
              id: uid,
              accountNo: uid,
              customerName: customer ? customer.name : "Unknown",
              agentName: customer ? customer.agentName : "",
              route: customer ? customer.route : "",
              ...uidData
            });
          } else {
            Object.entries(uidData).forEach(([subId, subTransaction]) => {
              if (subTransaction && typeof subTransaction === 'object') {
                const customer = customerListCache.find(c => c.accountNo === uid);
                transactionList.push({
                  id: subId,
                  uid,
                  accountNo: uid,
                  customerName: customer ? customer.name : "Unknown",
                  agentName: customer ? customer.agentName : "",
                  route: customer ? customer.route : "",
                  ...subTransaction
                });
              }
            });
          }
        }
      });

      transactionList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setTransactions(transactionList);
      setLoading(false);
    });
  }, []);

  const allRoutes = ["All Routes", ...new Set(customers.map(c => c.route).filter(Boolean))];
  const allAgents = ["All Agents", ...agents.map(a => a.name).filter(Boolean)];

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = searchTerm === "" || 
      (t.customerName && t.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.accountNo && t.accountNo.includes(searchTerm)) ||
      (t.agentName && t.agentName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRoute = selectedRoute === "All Routes" || t.route === selectedRoute;
    // Case-insensitive agent name comparison
    const matchesAgent = selectedAgent === "All Agents" || 
      (t.agentName && t.agentName.toLowerCase() === selectedAgent.toLowerCase());
    
    // Date filtering - show transactions for selected date only
    let matchesDate = true;
    if (selectedDate) {
      const transactionDate = new Date(t.timestamp || t.date);
      const selected = new Date(selectedDate);
      const dayStart = new Date(selected);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(selected);
      dayEnd.setHours(23, 59, 59, 999);
      matchesDate = transactionDate >= dayStart && transactionDate <= dayEnd;
    }
    
    return matchesSearch && matchesRoute && matchesAgent && matchesDate;
  });

  const totalDeposits = filteredTransactions
    .filter(t => t.type === "DEPOSIT" || t.type === "deposit")
    .reduce((sum, t) => sum + (parseInt(t.amount) || 0), 0);

  const totalWithdrawals = filteredTransactions
    .filter(t => t.type === "WITHDRAWAL" || t.type === "withdrawal")
    .reduce((sum, t) => sum + (parseInt(t.amount) || 0), 0);

  const netAmount = totalDeposits - totalWithdrawals;

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Time,Account No,Customer Name,Type,Amount (₹),Mode,Agent,Route\n";
    filteredTransactions.forEach(t => {
      const date = t.date || new Date(t.timestamp || Date.now()).toLocaleDateString('en-IN');
      const time = t.time || new Date(t.timestamp || Date.now()).toLocaleTimeString('en-IN');
      csvContent += `${date},${time},${t.accountNo},${t.customerName},${t.type},${t.amount},${t.mode || 'cash'},${t.agentName},${t.route}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pigmi_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" style={{ width: "3rem", height: "3rem" }}></div>
          <p className="mt-3 text-muted">Loading transactions...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <div className="page-header mb-4">
        <h3 className="fw-bold">
          ₹ All Transactions
        </h3>
        <p className="text-muted mb-0">View all deposit and withdrawal transactions</p>
      </div>

      {/* Summary Cards */}
      <Row className="mb-4 g-3">
        <Col md={4}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h6 className="text-muted">Total Deposits</h6>
              <h3 className="text-success fw-bold">₹{totalDeposits.toLocaleString()}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h6 className="text-muted">Total Withdrawals</h6>
              <h3 className="text-danger fw-bold">₹{totalWithdrawals.toLocaleString()}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h6 className="text-muted">Net Amount</h6>
              <h3 className="text-primary fw-bold">₹{netAmount.toLocaleString()}</h3>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-3">
          <Row className="mb-3 g-2">
            <Col md={4}>
              <InputGroup>
                <InputGroup.Text><Search size={16} /></InputGroup.Text>
                <Form.Control 
                  placeholder="Search by customer name, account no, or agent..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={2}>
              <InputGroup>
                <InputGroup.Text><Filter size={16} /></InputGroup.Text>
                <Form.Select value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)}>
                  {allAgents.map((agent, i) => <option key={i}>{agent}</option>)}
                </Form.Select>
              </InputGroup>
            </Col>
            <Col md={2}>
              <InputGroup>
                <InputGroup.Text><Filter size={16} /></InputGroup.Text>
                <Form.Select value={selectedRoute} onChange={e => setSelectedRoute(e.target.value)}>
                  {allRoutes.map((r, i) => <option key={i}>{r}</option>)}
                </Form.Select>
              </InputGroup>
            </Col>
            <Col md={2}>
              <Form.Control 
                type="date" 
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                placeholder="Select Date"
              />
            </Col>
            <Col md={1}>
              <Button size="sm" onClick={exportToCSV} style={{ backgroundColor: 'rgb(238,95,14)', border: 'none', color: 'white', width: '100%' }}>
                <Download size={14} className="me-1" />
                Export CSV
              </Button>
            </Col>
            <Col md={1}>
              {(selectedDate || searchTerm || selectedAgent !== "All Agents" || selectedRoute !== "All Routes") && (
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  onClick={() => {
                    setSelectedDate("");
                    setSearchTerm("");
                    setSelectedAgent("All Agents");
                    setSelectedRoute("All Routes");
                  }}
                  title="Clear all filters"
                  className="w-100"
                >
                  Clear
                </Button>
              )}
            </Col>
          </Row>

          <div className="table-responsive">
            <Table hover>
              <thead className="bg-light">
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Account No</th>
                  <th>Customer Name</th>
                  <th>Type</th>
                  <th>Amount (₹)</th>
                  <th>Mode</th>
                  <th>Receiver Number</th>
                  <th>Agent</th>
                  <th>Route</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length > 0 ? filteredTransactions.map((t, index) => {
                  const date = t.date || new Date(t.timestamp || Date.now()).toLocaleDateString('en-IN');
                  const time = t.time || new Date(t.timestamp || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                  const type = (t.type || "DEPOSIT").toUpperCase();
                  const isDeposit = type === "DEPOSIT";

                  return (
                    <tr key={t.id || index} className="align-middle">
                      <td>{date}</td>
                      <td className="text-muted"><small>{time}</small></td>
                      <td><Badge bg="outline-primary" text="dark">{t.accountNo}</Badge></td>
                      <td className="fw-semibold">{t.customerName || "Unknown"}</td>
                      <td>
                        <Badge bg={isDeposit ? "success" : "danger"}>
                          {type}
                        </Badge>
                      </td>
                      <td className={`fw-bold ${isDeposit ? 'text-success' : 'text-danger'}`}>
                        ₹{(parseInt(t.amount) || 0).toLocaleString()}
                      </td>
                      <td>
                        {(t.mode || 'cash').toUpperCase() === 'CASH' ? (
                          <Badge bg="success">CASH</Badge>
                        ) : (t.mode || 'ONLINE').toUpperCase() === 'ONLINE' ? (
                          <Badge bg="info">ONLINE</Badge>
                        ) : (
                          <Badge bg="warning">{(t.mode || 'OTHER').toUpperCase()}</Badge>
                        )}
                      </td>
                      <td>
                        {t.mode?.toLowerCase() === 'online' && t.receiverPhoneNumber ? (
                          <span className="text-dark fw-semibold">{t.receiverPhoneNumber}</span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>{t.agentName || '-'}</td>
                      <td>{t.route || '-'}</td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="10" className="text-center text-muted py-4">
                      <DollarSign size={32} className="mb-2" /><br />
                      No transactions found
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

export default TransactionsPage;
