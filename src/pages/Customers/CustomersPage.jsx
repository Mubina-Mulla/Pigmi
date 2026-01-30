import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Table,
  Card,
  Modal,
  Form,
  Button,
  Badge,
  InputGroup
} from "react-bootstrap";
import { ref, onValue, set, update } from "firebase/database";
import { database } from "../../firebase";
import { generateAccountNumber, generateTransactionId } from "../../utils/dataValidation";
import {
  Search,
  Filter,
  Plus,
  Edit,
  Download,
  Eye,
  Users,
  TrendingUp,
  CheckCircle,
  XCircle
} from "react-feather";

function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoute, setSelectedRoute] = useState("All Routes");
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState(null);
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [selectedCustomerForEdit, setSelectedCustomerForEdit] = useState(null);
  const [showCustomerDetailsModal, setShowCustomerDetailsModal] = useState(false);
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState(null);

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

  const [newCustomer, setNewCustomer] = useState({
    name: "",
    mobile: "",
    agentName: "",
    initialDeposit: ""
  });

  const [editCustomer, setEditCustomer] = useState({
    name: "",
    mobile: "",
    agentName: "",
    route: []
  });

  const [newPayment, setNewPayment] = useState({
    type: "deposit",
    amount: "",
    note: "",
    mode: "cash",
    method: ""
  });

  // Fetch data
  useEffect(() => {
    const customersRef = ref(database, "customers");
    const agentsRef = ref(database, "agents");
    const transactionsRef = ref(database, "transactions");

    onValue(agentsRef, (snapshot) => {
      const agentData = snapshot.val() || {};
      const agentList = [];
      Object.entries(agentData).forEach(([agentName, agentInfo]) => {
        if (agentInfo) {
          agentList.push({
            name: agentName,
            mobile: agentInfo.mobile || "",
            password: agentInfo.password || "",
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
          const totalAmount = parseFloat(customerInfo.totalAmount) || 0;
          const withdrawnAmount = parseFloat(customerInfo.withdrawnAmount) || 0;
          const balance = totalAmount - withdrawnAmount;
          let createdAt = "";
          if (customerInfo.createdDate) {
            const date = new Date(Number(customerInfo.createdDate));
            createdAt = date.toLocaleString('en-IN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
          }
          customerList.push({
            id: customerId,
            customerId: customerId,
            accountNo: customerInfo.accountNo || customerId,
            name: customerInfo.name || customerInfo.customerName || "Unknown",
            mobile: customerInfo.mobile || customerInfo.mobileNumber || customerInfo.phone || "",
            totalAmount: totalAmount,
            withdrawnAmount: withdrawnAmount,
            balance: balance,
            createdDateTimestamp: customerInfo.createdDate,
            interestApplied: customerInfo.interestApplied || false,
            lastInterestApplied: customerInfo.lastInterestApplied || null,
            appliedInterestAmount: customerInfo.appliedInterestAmount || 0,
            appliedInterestRate: customerInfo.appliedInterestRate || 0,
            agentName: customerInfo.agentName || customerInfo.agent || "",
            route: customerInfo.route || "",
            createdAt: createdAt,
            createdDate: createdAt,
            lastUpdated: customerInfo.lastUpdated || Date.now(),
            lastUpdatedFormatted: customerInfo.lastUpdatedFormatted || new Date(customerInfo.lastUpdated || Date.now()).toLocaleString('en-IN'),
            paymentMethod: customerInfo.paymentMethod || "Cash",
            status: customerInfo.status || "Active",
            upiId: customerInfo.upiId || "",
            transactions: customerInfo.transactions || {}
          });
        }
      });
      setCustomers(customerList);
      setLoading(false);
    });

    onValue(transactionsRef, (snapshot) => {
      const transactionData = snapshot.val() || {};
      const transactionList = [];
      Object.entries(transactionData).forEach(([uid, uidData]) => {
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
  }, []);

  const allRoutes = ["All Routes", ...new Set(customers.map(c => c.route).filter(Boolean))];
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = searchTerm === "" || 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.mobile.includes(searchTerm) ||
      c.accountNo.includes(searchTerm) ||
      c.agentName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRoute = selectedRoute === "All Routes" || c.route === selectedRoute;
    return matchesSearch && matchesRoute;
  });

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    const accountNo = generateAccountNumber();
    const customerData = {
      accountNo,
      name: newCustomer.name,
      mobile: newCustomer.mobile,
      agentName: newCustomer.agentName,
      route: agents.find(a => a.name === newCustomer.agentName)?.route || [],
      totalAmount: parseFloat(newCustomer.initialDeposit) || 0,
      withdrawnAmount: 0,
      createdDate: Date.now(),
      lastUpdated: Date.now(),
      status: "Active",
      paymentMethod: "Cash"
    };

    if (parseFloat(newCustomer.initialDeposit) > 0) {
      const transactionId = generateTransactionId();
      const transaction = {
        type: "deposit",
        amount: parseFloat(newCustomer.initialDeposit),
        date: new Date().toISOString().split('T')[0],
        timestamp: Date.now(),
        mode: "cash",
        note: "Initial deposit",
        addedBy: "admin"
      };
      customerData.transactions = { [transactionId]: transaction };
      await set(ref(database, `transactions/${accountNo}/${transactionId}`), transaction);
    }

    await set(ref(database, `customers/${accountNo}`), customerData);
    setShowAddCustomerModal(false);
    setNewCustomer({ name: "", mobile: "", agentName: "", initialDeposit: "" });
  };

  // Apply interest to a specific customer
  const applyInterestToCustomer = async (customer) => {
    try {
      const balance = customer.balance || 0;
      const { rate, amount } = calculateTimeBasedInterest(balance, customer.createdDateTimestamp);
      
      if (rate === 0 || amount === 0) {
        alert(`${customer.name}: No interest available yet. Account needs to be at least 6 months old.`);
        return;
      }

      if (!window.confirm(
        `Apply interest to ${customer.name}?\n\n` +
        `Current Balance: ₹${balance.toFixed(2)}\n` +
        `Interest Rate: ${rate}%\n` +
        `Interest Amount: ₹${amount.toFixed(2)}\n` +
        `New Balance: ₹${(balance + amount).toFixed(2)}\n\n` +
        `This will add the interest to the customer's balance in Firebase.`
      )) {
        return;
      }

      // Create interest transaction
      const transactionId = generateTransactionId();
      const interestTransaction = {
        type: "interest",
        amount: amount,
        date: new Date().toISOString().split('T')[0],
        timestamp: Date.now(),
        mode: "auto",
        note: `Interest applied: ${rate}% for account age`,
        addedBy: "system"
      };

      // Update customer with interest added to totalAmount
      const updates = {};
      updates[`customers/${customer.accountNo}/totalAmount`] = (customer.totalAmount || 0) + amount;
      updates[`customers/${customer.accountNo}/interestApplied`] = true;
      updates[`customers/${customer.accountNo}/lastInterestApplied`] = Date.now();
      updates[`customers/${customer.accountNo}/appliedInterestAmount`] = amount;
      updates[`customers/${customer.accountNo}/appliedInterestRate`] = rate;
      updates[`customers/${customer.accountNo}/lastUpdated`] = Date.now();
      updates[`transactions/${customer.accountNo}/${transactionId}`] = interestTransaction;

      await update(ref(database), updates);
      
      alert(`✓ Interest applied successfully!\n\n${customer.name}\nInterest: ₹${amount.toFixed(2)} (${rate}%)\nNew Balance: ₹${(balance + amount).toFixed(2)}`);
    } catch (error) {
      console.error('Error applying interest:', error);
      alert('Error applying interest. Please try again.');
    }
  };

  // Apply interest to all eligible customers
  const applyInterestToAll = async () => {
    const eligible = filteredCustomers.filter(c => {
      const { rate } = calculateTimeBasedInterest(c.balance, c.createdDateTimestamp);
      return rate > 0 && !c.interestApplied;
    });

    if (eligible.length === 0) {
      alert('No eligible customers found.\n\nCustomers need to be at least 6 months old and not have interest already applied.');
      return;
    }

    if (!window.confirm(
      `Apply interest to ${eligible.length} eligible customers?\n\n` +
      `This will add interest to their balances in Firebase.`
    )) {
      return;
    }

    let applied = 0;
    let failed = 0;

    for (const customer of eligible) {
      try {
        const balance = customer.balance || 0;
        const { rate, amount } = calculateTimeBasedInterest(balance, customer.createdDateTimestamp);
        
        const transactionId = generateTransactionId();
        const interestTransaction = {
          type: "interest",
          amount: amount,
          date: new Date().toISOString().split('T')[0],
          timestamp: Date.now(),
          mode: "auto",
          note: `Interest applied: ${rate}% for account age`,
          addedBy: "system"
        };

        const updates = {};
        updates[`customers/${customer.accountNo}/totalAmount`] = (customer.totalAmount || 0) + amount;
        updates[`customers/${customer.accountNo}/interestApplied`] = true;
        updates[`customers/${customer.accountNo}/lastInterestApplied`] = Date.now();
        updates[`customers/${customer.accountNo}/appliedInterestAmount`] = amount;
        updates[`customers/${customer.accountNo}/appliedInterestRate`] = rate;
        updates[`customers/${customer.accountNo}/lastUpdated`] = Date.now();
        updates[`transactions/${customer.accountNo}/${transactionId}`] = interestTransaction;

        await update(ref(database), updates);
        applied++;
      } catch (error) {
        console.error(`Error applying interest to ${customer.name}:`, error);
        failed++;
      }
    }

    alert(`Interest Application Complete!\n\nApplied: ${applied}\nFailed: ${failed}`);
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    const transactionId = generateTransactionId();
    const transaction = {
      type: newPayment.type,
      amount: parseFloat(newPayment.amount),
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
      mode: newPayment.mode,
      note: newPayment.note,
      addedBy: "admin"
    };

    await set(ref(database, `transactions/${selectedCustomerForPayment.accountNo}/${transactionId}`), transaction);
    
    const updates = {};
    if (newPayment.type === "deposit") {
      updates[`customers/${selectedCustomerForPayment.accountNo}/totalAmount`] = (selectedCustomerForPayment.totalAmount || 0) + parseFloat(newPayment.amount);
    } else {
      updates[`customers/${selectedCustomerForPayment.accountNo}/withdrawnAmount`] = (selectedCustomerForPayment.withdrawnAmount || 0) + parseFloat(newPayment.amount);
    }
    updates[`customers/${selectedCustomerForPayment.accountNo}/lastUpdated`] = Date.now();
    
    await update(ref(database), updates);
    setShowAddPaymentModal(false);
    setNewPayment({ type: "deposit", amount: "", note: "", mode: "cash", method: "" });
    setSelectedCustomerForPayment(null);
  };

  const handleEditCustomer = (customer) => {
    setSelectedCustomerForEdit(customer);
    setEditCustomer({
      name: customer.name,
      mobile: customer.mobile,
      agentName: customer.agentName,
      route: Array.isArray(customer.route) ? customer.route : [customer.route]
    });
    setShowEditCustomerModal(true);
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    const updates = {};
    updates[`customers/${selectedCustomerForEdit.accountNo}/name`] = editCustomer.name;
    updates[`customers/${selectedCustomerForEdit.accountNo}/mobile`] = editCustomer.mobile;
    updates[`customers/${selectedCustomerForEdit.accountNo}/agentName`] = editCustomer.agentName;
    updates[`customers/${selectedCustomerForEdit.accountNo}/route`] = editCustomer.route;
    updates[`customers/${selectedCustomerForEdit.accountNo}/lastUpdated`] = Date.now();
    
    await update(ref(database), updates);
    setShowEditCustomerModal(false);
    setSelectedCustomerForEdit(null);
  };

  const handlePaymentClick = (customer) => {
    setSelectedCustomerForPayment(customer);
    setNewPayment({ type: "deposit", amount: "", note: "", mode: "cash", method: "" });
    setShowAddPaymentModal(true);
  };

  const handleCustomerClick = (customer) => {
    const customerTransactions = transactions.filter(t => 
      t.accountNo === customer.accountNo || 
      t.customerId === customer.customerId ||
      t.uid === customer.accountNo
    );
    setSelectedCustomerDetails({ ...customer, transactions: customerTransactions });
    setShowCustomerDetailsModal(true);
  };

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Account No,Name,Mobile Number,Deposit Amount,Withdrawn Amount,Balance,Agent,Route,Status,Created Date\n";
    filteredCustomers.forEach(c => {
      csvContent += `${c.accountNo},${c.name},${c.mobile},${c.totalAmount || 0},${c.withdrawnAmount || 0},${c.balance || 0},${c.agentName},${c.route},${c.status || 'Active'},${c.createdAt}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pigmi_customers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" style={{ width: "3rem", height: "3rem" }}></div>
          <p className="mt-3 text-muted">Loading customers...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <div className="page-header mb-4">
        <h3 className="fw-bold">
          <Users size={28} className="me-2" />
          All Customers
        </h3>
        <p className="text-muted mb-0">Manage all customer records and transactions</p>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-3">
          <Row className="mb-3 g-2">
            <Col md={6}>
              <InputGroup>
                <InputGroup.Text><Search size={16} /></InputGroup.Text>
                <Form.Control 
                  placeholder="Search by name, mobile, account no, or agent..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={3}>
              <InputGroup>
                <InputGroup.Text><Filter size={16} /></InputGroup.Text>
                <Form.Select value={selectedRoute} onChange={e => setSelectedRoute(e.target.value)}>
                  {allRoutes.map((r, i) => <option key={i}>{r}</option>)}
                </Form.Select>
              </InputGroup>
            </Col>
            <Col md={3} className="d-flex justify-content-end gap-2">
              <Button variant="primary" onClick={() => setShowAddCustomerModal(true)} size="sm">
                <Plus size={14} className="me-1" />
                Add Customer
              </Button>
              <Button variant="outline-success" size="sm" onClick={exportToCSV}>
                <Download size={14} className="me-1" />
                Export CSV
              </Button>
            </Col>
          </Row>

          <div className="table-responsive">
            <Table hover>
              <thead className="bg-light">
                <tr>
                  <th>Account No</th>
                  <th>Name</th>
                  <th>Mobile Number</th>
                  <th>Deposit Amount</th>
                  <th>Withdrawn Amount</th>
                  <th>Balance (with Interest)</th>
                  <th>Interest Status</th>
                  <th>Agent</th>
                  <th>Route</th>
                  <th>Created Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length > 0 ? filteredCustomers.map((c, index) => {
                  const balance = c.balance || 0;
                  const { rate, amount } = calculateTimeBasedInterest(balance, c.createdDateTimestamp);
                  const balanceWithInterest = balance + amount;
                  
                  // Calculate 6-month and 12-month interest
                  const interest6Months = (balance * 3.5) / 100;
                  const balance6Months = balance + interest6Months;
                  const interest12Months = (balance * 7) / 100;
                  const balance12Months = balance + interest12Months;
                  
                  const created = new Date(Number(c.createdDateTimestamp));
                  const now = new Date();
                  const monthsElapsed = (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth());
                  
                  return (
                  <tr key={c.id} className="align-middle">
                    <td><Badge bg="outline-primary" text="dark">{c.accountNo || c.customerId}</Badge></td>
                    <td className="fw-semibold">{c.name}</td>
                    <td>{c.mobile || c.mobileNumber}</td>
                    <td className="text-success fw-bold">₹{(c.totalAmount || 0).toLocaleString()}</td>
                    <td className="text-danger fw-bold">₹{(c.withdrawnAmount || 0).toLocaleString()}</td>
                    <td className="text-primary fw-bold">
                      <div>
                        <div className="fs-6 fw-bold">₹{balanceWithInterest.toFixed(2)}</div>
                        <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                          Base: ₹{balance.toFixed(2)}
                          {amount > 0 && (
                            <> + ₹{amount.toFixed(2)} ({rate}%)</>
                          )}
                        </small>
                        <br />
                        <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                          Age: {monthsElapsed} months
                        </small>
                        <br />
                        <div className="mt-1" style={{ fontSize: '0.7rem' }}>
                          <Badge bg="info" className="me-1" style={{ fontSize: '0.65rem' }}>
                            6M: ₹{balance6Months.toFixed(2)}
                          </Badge>
                          <Badge bg="success" style={{ fontSize: '0.65rem' }}>
                            12M: ₹{balance12Months.toFixed(2)}
                          </Badge>
                        </div>
                      </div>
                    </td>
                    <td>
                      {c.interestApplied ? (
                        <div>
                          <Badge bg="success" className="mb-1">
                            <CheckCircle size={12} className="me-1" />
                            Applied
                          </Badge>
                          <br />
                          <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                            ₹{(c.appliedInterestAmount || 0).toFixed(2)} ({c.appliedInterestRate}%)
                          </small>
                          {c.lastInterestApplied && (
                            <><br />
                            <small className="text-muted" style={{ fontSize: '0.65rem' }}>
                              {new Date(c.lastInterestApplied).toLocaleDateString('en-IN')}
                            </small></>
                          )}
                        </div>
                      ) : rate > 0 ? (
                        <Badge bg="warning" text="dark">
                          <XCircle size={12} className="me-1" />
                          Not Applied
                        </Badge>
                      ) : (
                        <Badge bg="secondary">
                          Not Eligible
                        </Badge>
                      )}
                    </td>
                    <td>{c.agentName}</td>
                    <td><Badge bg="outline-info" text="dark">{Array.isArray(c.route) ? c.route.join(', ') : c.route}</Badge></td>
                    <td className="text-muted"><small>{c.createdAt || c.createdDateFormatted}</small></td>
                    <td>
                      <Badge bg="success">
                        Active
                      </Badge>
                    </td>
                    <td>
                      <div className="d-flex gap-1 flex-wrap">
                        {rate > 0 && !c.interestApplied && (
                          <Button 
                            variant="success" 
                            size="sm" 
                            onClick={() => applyInterestToCustomer(c)} 
                            title="Apply Interest"
                          >
                            <TrendingUp size={14} />
                          </Button>
                        )}
                        <Button variant="outline-success" size="sm" onClick={() => handlePaymentClick(c)} title="Add Payment">₹</Button>
                        <Button variant="outline-warning" size="sm" onClick={() => handleEditCustomer(c)} title="Edit Customer & Route">
                          <Edit size={14} />
                        </Button>
                        <Button variant="outline-primary" size="sm" onClick={() => handleCustomerClick(c)} title="View Details">
                          <Eye size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="12" className="text-center text-muted py-4">
                      <Users size={32} className="mb-2" /><br />
                      No customers found
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Add Customer Modal */}
      <Modal show={showAddCustomerModal} onHide={() => setShowAddCustomerModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add New Customer</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAddCustomer}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Customer Name</Form.Label>
              <Form.Control value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Mobile Number</Form.Label>
              <Form.Control value={newCustomer.mobile} onChange={e => setNewCustomer({...newCustomer, mobile: e.target.value})} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Select Agent</Form.Label>
              <Form.Select value={newCustomer.agentName} onChange={e => setNewCustomer({...newCustomer, agentName: e.target.value})} required>
                <option value="">Choose agent...</option>
                {agents.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Initial Deposit (Optional)</Form.Label>
              <Form.Control type="number" value={newCustomer.initialDeposit} onChange={e => setNewCustomer({...newCustomer, initialDeposit: e.target.value})} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAddCustomerModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Add Customer</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Add Payment Modal */}
      <Modal show={showAddPaymentModal} onHide={() => setShowAddPaymentModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add Payment</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAddPayment}>
          <Modal.Body>
            {selectedCustomerForPayment && (
              <div className="mb-3">
                <strong>{selectedCustomerForPayment.name}</strong> - {selectedCustomerForPayment.accountNo}
              </div>
            )}
            <Form.Group className="mb-3">
              <Form.Label>Payment Type</Form.Label>
              <Form.Select value={newPayment.type} onChange={e => setNewPayment({...newPayment, type: e.target.value})}>
                <option value="deposit">Deposit</option>
                <option value="withdrawal">Withdrawal</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Amount</Form.Label>
              <Form.Control type="number" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: e.target.value})} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Mode</Form.Label>
              <Form.Select value={newPayment.mode} onChange={e => setNewPayment({...newPayment, mode: e.target.value})}>
                <option value="cash">Cash</option>
                <option value="online">Online</option>
                <option value="check">Check</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Note</Form.Label>
              <Form.Control as="textarea" value={newPayment.note} onChange={e => setNewPayment({...newPayment, note: e.target.value})} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAddPaymentModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Add Payment</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal show={showEditCustomerModal} onHide={() => setShowEditCustomerModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Customer</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUpdateCustomer}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Customer Name</Form.Label>
              <Form.Control value={editCustomer.name} onChange={e => setEditCustomer({...editCustomer, name: e.target.value})} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Mobile Number</Form.Label>
              <Form.Control value={editCustomer.mobile} onChange={e => setEditCustomer({...editCustomer, mobile: e.target.value})} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Select Agent</Form.Label>
              <Form.Select value={editCustomer.agentName} onChange={e => setEditCustomer({...editCustomer, agentName: e.target.value})} required>
                <option value="">Choose agent...</option>
                {agents.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditCustomerModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Update Customer</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Customer Details Modal */}
      <Modal show={showCustomerDetailsModal} onHide={() => setShowCustomerDetailsModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Customer Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedCustomerDetails && (
            <div>
              <h5>{selectedCustomerDetails.name}</h5>
              <p><strong>Account No:</strong> {selectedCustomerDetails.accountNo}</p>
              <p><strong>Mobile:</strong> {selectedCustomerDetails.mobile}</p>
              <p><strong>Agent:</strong> {selectedCustomerDetails.agentName}</p>
              <p><strong>Total Deposits:</strong> ₹{(selectedCustomerDetails.totalAmount || 0).toLocaleString()}</p>
              <p><strong>Total Withdrawn:</strong> ₹{(selectedCustomerDetails.withdrawnAmount || 0).toLocaleString()}</p>
              <p><strong>Balance:</strong> ₹{(selectedCustomerDetails.balance || 0).toLocaleString()}</p>
              <hr />
              <h6>Recent Transactions</h6>
              {selectedCustomerDetails.transactions && selectedCustomerDetails.transactions.length > 0 ? (
                <Table size="sm" striped>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCustomerDetails.transactions.slice(0, 10).map((t, i) => (
                      <tr key={i}>
                        <td>{t.date}</td>
                        <td>{t.type}</td>
                        <td>₹{(t.amount || 0).toLocaleString()}</td>
                        <td>{t.mode}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p className="text-muted">No transactions found</p>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCustomerDetailsModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default CustomersPage;
