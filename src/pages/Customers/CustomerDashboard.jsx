import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Table,
  Card,
  Button,
  Badge,
  Modal,
  Form,
  InputGroup
} from "react-bootstrap";
import { ref, onValue, set, update, get, remove } from "firebase/database";
import { database } from "../../firebase";
import { ArrowLeft, Plus, TrendingUp, TrendingDown, DollarSign, Calendar, Search, Download } from "react-feather";
import { toast } from 'react-toastify';
import { generateTransactionId } from "../../utils/dataValidation";

function CustomerDashboard() {
  const { accountNo } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fromAgent = location.state?.from === 'agent';
  const agentName = location.state?.agentName;
  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false);
  const [currentTransactionId, setCurrentTransactionId] = useState("");
  const [newTransaction, setNewTransaction] = useState({
    type: "deposit",
    amount: "",
    note: "",
    mode: "cash",
    receiverPhoneNumber: ""
  });

  useEffect(() => {
    // Clear any cached transactions first
    setTransactions([]);
    setLoading(true);
    
    let isUnmounting = false;
    
    // Fetch customer data
    const customerRef = ref(database, `customers/${accountNo}`);
    const unsubscribeCustomer = onValue(customerRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setCustomer({
          accountNo,
          ...data
        });
        setLoading(false);
      } else if (!isUnmounting) {
        // Customer doesn't exist - silently redirect
        navigate('/customers', { replace: true });
      }
    });

    // Fetch transactions from both agent's customer path and global path
    const fetchTransactions = async () => {
      try {
        const customerSnapshot = await get(ref(database, `customers/${accountNo}`));
        const customerData = customerSnapshot.val();
        
        console.log("=== FETCHING FRESH TRANSACTIONS FROM FIREBASE ===");
        console.log("Account No:", accountNo);
        console.log("Customer Data:", customerData);
        
        const allTransactions = new Map(); // Use Map to avoid duplicates
        
        // Set up real-time listener for global transactions
        const globalTransPath = `transactions/${accountNo}`;
        const globalTransRef = ref(database, globalTransPath);
        const unsubscribeGlobal = onValue(globalTransRef, (globalSnapshot) => {
          const globalData = globalSnapshot.val();
          console.log("Real-time update - Global transactions data:", globalData);
          
          if (globalData && Object.keys(globalData).length > 0) {
            Object.entries(globalData).forEach(([id, trans]) => {
              allTransactions.set(id, { id, ...trans });
            });
          }
          
          // Update state with all collected transactions
          const transactionList = Array.from(allTransactions.values())
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          console.log("✅ Total transactions found:", transactionList.length);
          setTransactions(transactionList);
        });
        
        // Also set up listener for agent's transactions if agent exists
        let unsubscribeAgent = null;
        if (customerData && customerData.agentName) {
          const transactionsPath = `agents/${customerData.agentName}/customers/${accountNo}/transactions`;
          console.log("Also fetching from agent path:", transactionsPath);
          
          const transactionsRef = ref(database, transactionsPath);
          unsubscribeAgent = onValue(transactionsRef, (snapshot) => {
            const data = snapshot.val();
            console.log("Real-time update - Agent path data:", data);
            
            if (data && Object.keys(data).length > 0) {
              Object.entries(data).forEach(([id, trans]) => {
                allTransactions.set(id, { id, ...trans });
              });
              
              // Update state with all collected transactions
              const transactionList = Array.from(allTransactions.values())
                .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
              console.log("✅ Total transactions found:", transactionList.length);
              setTransactions(transactionList);
            }
          });
        }
        
        // Return cleanup function
        return () => {
          unsubscribeGlobal();
          if (unsubscribeAgent) unsubscribeAgent();
        };
      } catch (error) {
        console.error("❌ Error fetching transactions:", error);
        setTransactions([]);
      }
    };
    
    fetchTransactions();
    
    // Cleanup function
    return () => {
      isUnmounting = true;
      unsubscribeCustomer();
    };
  }, [accountNo, navigate]);

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    
    const amount = parseInt(newTransaction.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const transactionId = currentTransactionId || generateTransactionId();
    const timestamp = Date.now();
    const currentDate = new Date(timestamp);
    
    // Format date as DD/MM/YYYY to match app format
    const formattedDate = currentDate.toLocaleDateString('en-GB');
    
    // Format time as HH:MM:SS to match app format
    const formattedTime = currentDate.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    
    // Create description based on type and mode
    const description = newTransaction.type === "deposit" 
      ? `Deposit (${newTransaction.mode.charAt(0).toUpperCase() + newTransaction.mode.slice(1)})`
      : `Withdrawal (${newTransaction.mode.charAt(0).toUpperCase() + newTransaction.mode.slice(1)})`;
    
    const transaction = {
      transactionId: transactionId,
      agentId: customer.agentName || "admin",
      agentName: customer.agentName || "admin",
      amount: amount,
      date: formattedDate,
      description: description,
      mode: newTransaction.mode,
      route: Array.isArray(customer.route) ? customer.route.join(', ') : (customer.route || ""),
      time: formattedTime,
      timestamp: timestamp,
      type: newTransaction.type.toUpperCase(),
      addedBy: "admin"
    };
    
    // Add note if provided
    if (newTransaction.note) {
      transaction.note = newTransaction.note;
    }
    
    // Add receiver number if mode is online
    if (newTransaction.mode === "online" && newTransaction.receiverPhoneNumber) {
      transaction.receiverPhoneNumber = newTransaction.receiverPhoneNumber;
    }

    try {
      // Save transaction under the agent's customer path
      const agentId = customer.agentName || "admin";
      const dbPath = `agents/${agentId}/customers/${accountNo}/transactions/${transactionId}`;
      
      console.log("=== TRANSACTION DEBUG ===");
      console.log("Agent ID:", agentId);
      console.log("Account No:", accountNo);
      console.log("Transaction ID:", transactionId);
      console.log("Firebase Path:", dbPath);
      console.log("Transaction Object:", JSON.stringify(transaction, null, 2));
      
      await set(ref(database, dbPath), transaction);
      
      // Save to global transactions node grouped by account number
      const globalTransactionPath = `transactions/${accountNo}/${transactionId}`;
      const globalTransaction = {
        ...transaction,
        accountNo: accountNo,
        customerName: customer.name || "Unknown"
      };
      await set(ref(database, globalTransactionPath), globalTransaction);
      console.log("✅ Transaction saved to global transactions node:", globalTransactionPath);
      
      // Verify transaction was saved
      const verifySnapshot = await get(ref(database, dbPath));
      if (verifySnapshot.exists()) {
        console.log("✅ Transaction successfully saved to Firebase!");
        console.log("Verified data:", verifySnapshot.val());
      } else {
        console.log("❌ Transaction NOT found in Firebase after save!");
      }

      // Update customer totals
      const updates = {};
      if (newTransaction.type === "deposit") {
        updates[`customers/${accountNo}/totalAmount`] = (customer.totalAmount || 0) + amount;
        updates[`agents/${agentId}/customers/${accountNo}/totalAmount`] = (customer.totalAmount || 0) + amount;
      } else {
        updates[`customers/${accountNo}/withdrawnAmount`] = (customer.withdrawnAmount || 0) + amount;
        updates[`agents/${agentId}/customers/${accountNo}/withdrawnAmount`] = (customer.withdrawnAmount || 0) + amount;
      }
      updates[`customers/${accountNo}/lastUpdated`] = Date.now();
      updates[`agents/${agentId}/customers/${accountNo}/lastUpdated`] = Date.now();
      
      await update(ref(database), updates);

      setShowAddTransactionModal(false);
      setNewTransaction({ type: "deposit", amount: "", note: "", mode: "cash", receiverPhoneNumber: "" });
      setCurrentTransactionId("");
      toast.success(`${newTransaction.type === "deposit" ? "Deposit" : "Withdrawal"} added successfully!`);
    } catch (error) {
      console.error("Error adding transaction:", error);
      toast.error("Failed to add transaction");
    }
  };

  const handleCleanupTransactions = async () => {
    if (!window.confirm("This will delete ALL transactions for this customer from Firebase. Are you sure?")) {
      return;
    }

    try {
      const agentId = customer.agentName;
      
      // Get all transaction IDs before deleting
      const agentTransPath = `agents/${agentId}/customers/${accountNo}/transactions`;
      const transSnapshot = await get(ref(database, agentTransPath));
      
      // Delete from agent's path
      await remove(ref(database, agentTransPath));
      console.log("✅ Deleted transactions from:", agentTransPath);
      
      // Delete each transaction from global transactions node
      if (transSnapshot.exists()) {
        const transData = transSnapshot.val();
        for (const transactionId of Object.keys(transData)) {
          const globalPath = `transactions/${transactionId}`;
          await remove(ref(database, globalPath));
          console.log("✅ Deleted from global transactions:", globalPath);
        }
      }
      
      // Delete from old global transactions path if it exists (by account number)
      const globalTransPath = `transactions/${accountNo}`;
      await remove(ref(database, globalTransPath));
      console.log("✅ Deleted transactions from:", globalTransPath);
      
      // Reset customer totals to 0
      const updates = {};
      updates[`customers/${accountNo}/totalAmount`] = 0;
      updates[`customers/${accountNo}/withdrawnAmount`] = 0;
      updates[`agents/${agentId}/customers/${accountNo}/totalAmount`] = 0;
      updates[`agents/${agentId}/customers/${accountNo}/withdrawnAmount`] = 0;
      updates[`customers/${accountNo}/lastUpdated`] = Date.now();
      updates[`agents/${agentId}/customers/${accountNo}/lastUpdated`] = Date.now();
      
      await update(ref(database), updates);
      console.log("✅ Reset customer totals to 0");
      
      setTransactions([]);
      toast.success("All transactions cleaned up successfully!");
    } catch (error) {
      console.error("❌ Error cleaning up transactions:", error);
      toast.error("Failed to cleanup transactions: " + error.message);
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
        <Button onClick={() => navigate(fromAgent ? `/agents/${agentName}` : "/customers")} className="mt-3">
          {fromAgent ? "Back to Agent" : "Back to Customers"}
        </Button>
      </Container>
    );
  }

  const balance = (customer.totalAmount || 0) - (customer.withdrawnAmount || 0);

  const exportToCSV = () => {
    if (filteredTransactions.length === 0) {
      toast.error("No transactions to export");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Time,Type,Amount (₹),Mode,Receiver Number,Note,Added By\n";
    
    filteredTransactions.forEach(trans => {
      const dateTime = new Date(trans.timestamp).toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).split(', ');
      const date = dateTime[0] || '';
      const time = dateTime[1] || '';
      const type = trans.type?.toUpperCase() === "DEPOSIT" || 
                   trans.description?.toLowerCase().includes("deposit") 
                   ? "Deposit" : "Withdrawal";
      const amount = parseInt(trans.amount) || 0;
      const mode = (trans.mode || 'Cash').toUpperCase();
      const receiverNumber = trans.mode?.toLowerCase() === 'online' && trans.receiverPhoneNumber ? trans.receiverPhoneNumber : '-';
      const note = trans.note || "-";
      const addedBy = trans.addedBy || "Admin";
      
      csvContent += `${date},${time},${type},${amount},${mode},${receiverNumber},"${note}",${addedBy}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${customer.name}_${customer.accountNo}_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Transactions exported successfully!");
  };

  // Filter transactions based on search
  const filteredTransactions = transactions.filter(trans => {
    const searchLower = searchTerm.toLowerCase();
    const date = new Date(trans.timestamp).toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    return (
      date.toLowerCase().includes(searchLower) ||
      trans.type?.toLowerCase().includes(searchLower) ||
      trans.amount?.toString().includes(searchLower) ||
      trans.mode?.toLowerCase().includes(searchLower) ||
      trans.receiverPhoneNumber?.toLowerCase().includes(searchLower) ||
      trans.note?.toLowerCase().includes(searchLower) ||
      trans.addedBy?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 p-3 rounded" style={{ backgroundColor: 'rgb(255,255,255)' }}>
        <div>
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => navigate(fromAgent ? `/agents/${agentName}` : "/customers")}
          >
            <ArrowLeft size={16} className="me-1" />
            {fromAgent ? "Back to Agent" : "Back to Customers"}
          </Button>
        </div>
        <Button
          style={{ backgroundColor: 'rgb(239,97,16)', border: 'none', color: '#ffffff' }}
          onClick={() => {
            const newTxnId = generateTransactionId();
            setCurrentTransactionId(newTxnId);
            setShowAddTransactionModal(true);
          }}
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
              <p className="text-muted mb-0">Account: {customer.accountNumber || customer.accountNo}</p>
            </Col>
          </Row>
          <hr />
          <Row>
            <Col md={6}>
              <p><strong>Mobile:</strong> {customer.mobileNumber || customer.mobile}</p>
              <p><strong>Address:</strong> {customer.address}</p>
              <p><strong>Village:</strong> {customer.village || "N/A"}</p>
            </Col>
            <Col md={6}>
              <p><strong>Aadhar:</strong> {customer.aadhaarNumber || customer.aadharNumber}</p>
              <p><strong>Agent:</strong> {customer.agentName}</p>
              <p><strong>Route:</strong> {Array.isArray(customer.route) ? customer.route.join(', ') : (customer.route || "N/A")}</p>
              <p><strong>Status:</strong> <Badge bg="success">{customer.status || "Active"}</Badge></p>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Search Bar */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <InputGroup>
            <InputGroup.Text className="bg-white">
              <Search size={18} />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search transactions by date, type, amount, mode, receiver number, note, or added by..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ fontSize: '15px' }}
            />
          </InputGroup>
        </Card.Body>
      </Card>

      {/* Transactions Table */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-light d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Transaction History ({filteredTransactions.length})</h5>
          <Button
            size="sm"
            onClick={exportToCSV}
            style={{ backgroundColor: 'rgb(239,96,16)', border: 'none', color: 'white' }}
            disabled={filteredTransactions.length === 0}
          >
            <Download size={14} className="me-1" />
            Export CSV
          </Button>
        </Card.Header>
        <Card.Body className="p-0">
          <div>
            <Table hover className="mb-0">
              <thead className="bg-light">
                <tr>
                  <th>Transaction ID</th>
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
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((trans) => (
                    <tr key={trans.id}>
                      <td>
                        <Badge bg="secondary" className="font-monospace">{trans.transactionId || trans.id}</Badge>
                      </td>
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
                        <Badge bg={
                          trans.type?.toUpperCase() === "DEPOSIT" || 
                          trans.description?.toLowerCase().includes("deposit") 
                          ? "success" : "danger"
                        }>
                          {trans.type?.toUpperCase() === "DEPOSIT" || 
                          trans.description?.toLowerCase().includes("deposit")
                          ? "Deposit" : "Withdrawal"}
                        </Badge>
                      </td>
                      <td className={
                        trans.type?.toUpperCase() === "DEPOSIT" || 
                        trans.description?.toLowerCase().includes("deposit")
                        ? "text-success fw-bold" : "text-danger fw-bold"
                      }>
                        {trans.type?.toUpperCase() === "DEPOSIT" || 
                        trans.description?.toLowerCase().includes("deposit")
                        ? "+" : "-"}₹{(trans.amount || 0).toLocaleString()}
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

      {/* Add Transaction Modal */}
      <Modal show={showAddTransactionModal} onHide={() => {
        setShowAddTransactionModal(false);
        setCurrentTransactionId("");
      }} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add Transaction</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAddTransaction}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Transaction ID</Form.Label>
              <Form.Control
                type="text"
                value={currentTransactionId}
                disabled
                className="bg-light font-monospace fw-bold"
              />
              <Form.Text className="text-muted">
                This ID will be automatically assigned to this transaction
              </Form.Text>
            </Form.Group>

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
                value={newTransaction.amount}
                onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                required
                min="1"
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
            <Button variant="secondary" onClick={() => {
              setShowAddTransactionModal(false);
              setCurrentTransactionId("");
            }}>
              Cancel
            </Button>
            <Button style={{ backgroundColor: 'rgb(239,96,16)', border: 'none', color: '#ffffff' }} type="submit">
              Add Transaction
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}

export default CustomerDashboard;
