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
  Modal,
  Form
} from "react-bootstrap";
import { ref, onValue, set, update } from "firebase/database";
import { database } from "../../firebase";
import { ArrowLeft, Plus, TrendingUp, TrendingDown, DollarSign, Calendar } from "react-feather";
import { toast } from 'react-toastify';
import { generateTransactionId } from "../../utils/dataValidation";

function CustomerDashboard() {
  const { accountNo } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    type: "deposit",
    amount: "",
    note: "",
    mode: "cash",
    receiverPhoneNumber: ""
  });

  useEffect(() => {
    // Fetch customer data
    const customerRef = ref(database, `customers/${accountNo}`);
    onValue(customerRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setCustomer({
          accountNo,
          ...data
        });
      }
      setLoading(false);
    });

    // Fetch transactions
    const transactionsRef = ref(database, `transactions/${accountNo}`);
    onValue(transactionsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const transactionList = Object.entries(data).map(([id, trans]) => ({
        id,
        ...trans
      })).sort((a, b) => b.timestamp - a.timestamp);
      setTransactions(transactionList);
    });
  }, [accountNo]);

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    
    const amount = parseFloat(newTransaction.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const transactionId = generateTransactionId();
    const transaction = {
      type: newTransaction.type,
      amount: amount,
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
      mode: newTransaction.mode,
      note: newTransaction.note || "",
      addedBy: "admin"
    };
    
    // Add receiver number if mode is online
    if (newTransaction.mode === "online" && newTransaction.receiverPhoneNumber) {
      transaction.receiverPhoneNumber = newTransaction.receiverPhoneNumber;
    }

    try {
      // Save transaction
      await set(ref(database, `transactions/${accountNo}/${transactionId}`), transaction);

      // Update customer totals
      const updates = {};
      if (newTransaction.type === "deposit") {
        updates[`customers/${accountNo}/totalAmount`] = (customer.totalAmount || 0) + amount;
      } else {
        updates[`customers/${accountNo}/withdrawnAmount`] = (customer.withdrawnAmount || 0) + amount;
      }
      updates[`customers/${accountNo}/lastUpdated`] = Date.now();
      
      await update(ref(database), updates);

      setShowAddTransactionModal(false);
      setNewTransaction({ type: "deposit", amount: "", note: "", mode: "cash", receiverPhoneNumber: "" });
      toast.success(`${newTransaction.type === "deposit" ? "Deposit" : "Withdrawal"} added successfully!`);
    } catch (error) {
      console.error("Error adding transaction:", error);
      toast.error("Failed to add transaction");
    }
  };

  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center">Loading...</div>
      </Container>
    );
  }

  if (!customer) {
    return (
      <Container className="py-4">
        <div className="text-center">Customer not found</div>
        <Button onClick={() => navigate("/customers")} className="mt-3">
          Back to Customers
        </Button>
      </Container>
    );
  }

  const balance = (customer.totalAmount || 0) - (customer.withdrawnAmount || 0);

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 p-3 rounded" style={{ backgroundColor: '#e3f2fd' }}>
        <div>
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => navigate("/customers")}
          >
            <ArrowLeft size={16} className="me-1" />
            Back to Customers
          </Button>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowAddTransactionModal(true)}
        >
          <Plus size={16} className="me-1" />
          Add Transaction
        </Button>
      </div>

      {/* Summary Cards */}
      <Row className="mb-4 g-3">
        <Col xs={12} sm={6} md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-success bg-opacity-10 rounded-circle p-3 me-3">
                  <TrendingUp size={24} className="text-success" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Total Deposits</h6>
                  <h4 className="fw-bold mb-0">₹{(customer.totalAmount || 0).toLocaleString()}</h4>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-danger bg-opacity-10 rounded-circle p-3 me-3">
                  <TrendingDown size={24} className="text-danger" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Total Withdrawn</h6>
                  <h4 className="fw-bold mb-0">₹{(customer.withdrawnAmount || 0).toLocaleString()}</h4>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-primary bg-opacity-10 rounded-circle p-3 me-3">
                  <DollarSign size={24} className="text-primary" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Current Balance</h6>
                  <h4 className="fw-bold mb-0">₹{balance.toLocaleString()}</h4>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-info bg-opacity-10 rounded-circle p-3 me-3">
                  <Calendar size={24} className="text-info" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Total Transactions</h6>
                  <h4 className="fw-bold mb-0">{transactions.length}</h4>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Customer Details */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-light">
          <h5 className="mb-0">Customer Information</h5>
        </Card.Header>
        <Card.Body>
          <Row className="mb-3">
            <Col xs={12}>
              <h4 className="fw-bold mb-1">{customer.name}</h4>
              <p className="text-muted mb-0">Account: {customer.accountNo}</p>
            </Col>
          </Row>
          <hr />
          <Row>
            <Col md={6}>
              <p><strong>Mobile:</strong> {customer.mobile}</p>
              <p><strong>Address:</strong> {customer.address}</p>
              <p><strong>Village:</strong> {customer.village || "N/A"}</p>
            </Col>
            <Col md={6}>
              <p><strong>Aadhar:</strong> {customer.aadharNumber}</p>
              <p><strong>Agent:</strong> {customer.agentName}</p>
              <p><strong>Route:</strong> {Array.isArray(customer.route) ? customer.route.join(', ') : (customer.route || "N/A")}</p>
              <p><strong>Status:</strong> <Badge bg="success">{customer.status || "Active"}</Badge></p>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Transactions Table */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-light">
          <h5 className="mb-0">Transaction History</h5>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead className="bg-light">
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Mode</th>
                  <th>Receiver Number</th>
                  <th>Note</th>
                  <th>Added By</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length > 0 ? (
                  transactions.map((trans) => (
                    <tr key={trans.id}>
                      <td>
                        {new Date(trans.timestamp).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td>
                        <Badge bg={trans.type === "deposit" ? "success" : "danger"}>
                          {trans.type === "deposit" ? "Deposit" : "Withdrawal"}
                        </Badge>
                      </td>
                      <td className={trans.type === "deposit" ? "text-success fw-bold" : "text-danger fw-bold"}>
                        {trans.type === "deposit" ? "+" : "-"}₹{(trans.amount || 0).toLocaleString()}
                      </td>
                      <td>
                        <Badge bg="secondary">{trans.mode || "Cash"}</Badge>
                      </td>
                      <td>
                        {trans.mode?.toLowerCase() === 'online' && trans.receiverPhoneNumber ? (
                          <span className="text-dark fw-semibold">{trans.receiverPhoneNumber}</span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>{trans.note || "-"}</td>
                      <td>{trans.addedBy || "Admin"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center text-muted py-4">
                      No transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Add Transaction Modal */}
      <Modal show={showAddTransactionModal} onHide={() => setShowAddTransactionModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add Transaction</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAddTransaction}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Transaction Type</Form.Label>
              <Form.Select
                value={newTransaction.type}
                onChange={(e) => setNewTransaction({ ...newTransaction, type: e.target.value })}
              >
                <option value="deposit">Deposit</option>
                <option value="withdrawal">Withdrawal</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Amount</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                value={newTransaction.amount}
                onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Payment Mode</Form.Label>
              <Form.Select
                value={newTransaction.mode}
                onChange={(e) => setNewTransaction({ ...newTransaction, mode: e.target.value, receiverPhoneNumber: "" })}
              >
                <option value="cash">Cash</option>
                <option value="online">Online</option>
                <option value="check">Check</option>
              </Form.Select>
            </Form.Group>

            {newTransaction.mode === "online" && (
              <Form.Group className="mb-3">
                <Form.Label>Receiver Phone Number</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter receiver's phone number"
                  value={newTransaction.receiverPhoneNumber}
                  onChange={(e) => setNewTransaction({ ...newTransaction, receiverPhoneNumber: e.target.value })}
                  maxLength="15"
                  pattern="[0-9]*"
                  required
                />
                <Form.Text className="text-muted">
                  Enter the receiver's phone number for online transaction
                </Form.Text>
              </Form.Group>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Note (Optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={newTransaction.note}
                onChange={(e) => setNewTransaction({ ...newTransaction, note: e.target.value })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAddTransactionModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Add Transaction
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}

export default CustomerDashboard;
