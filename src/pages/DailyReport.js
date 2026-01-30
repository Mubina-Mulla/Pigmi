import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Table,
  Card,
  Form,
  Button,
  Badge
} from "react-bootstrap";
import { ref, onValue } from "firebase/database";
import { database } from "../firebase";
import {
  Download,
  CreditCard
} from "react-feather";

const DailyReport = () => {
  const [customers, setCustomers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoute, setSelectedRoute] = useState("All Routes");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // 🔹 Fetch data from Firebase
  useEffect(() => {
    const fetchData = () => {
      // Fetch from agents node
      const agentsRef = ref(database, "agents");
      onValue(agentsRef, (snapshot) => {
        const agentData = snapshot.val() || {};
        const customerList = [];
        const transactionList = [];

        // Process agents data
        Object.entries(agentData).forEach(([agentName, agentInfo]) => {
          const { route, customers } = agentInfo;
          if (customers) {
            Object.entries(customers).forEach(([accountNo, c]) => {
              let totalDeposits = 0;
              let totalWithdrawals = 0;

              if (c.transactions) {
                Object.entries(c.transactions).forEach(([tid, t]) => {
                  if (typeof t === "object" && t.amount !== undefined) {
                    const amt = Number(t.amount) || 0;
                    if ((t.type || "deposit").toLowerCase() === "deposit")
                      totalDeposits += amt;
                    else totalWithdrawals += amt;

                    // Fix date handling
                    let transactionDate = "";
                    if (t.date) {
                      transactionDate = t.date;
                    } else if (t.timestamp) {
                      if (typeof t.timestamp === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t.timestamp)) {
                        transactionDate = t.timestamp;
                      } else {
                        const dateObj = new Date(t.timestamp);
                        if (!isNaN(dateObj.getTime())) {
                          transactionDate = dateObj.toISOString().split("T")[0];
                        } else {
                          transactionDate = new Date().toISOString().split("T")[0];
                        }
                      }
                    } else {
                      transactionDate = new Date().toISOString().split("T")[0];
                    }

                    transactionList.push({
                      id: tid,
                      date: transactionDate,
                      time: new Date(t.timestamp || Date.now()).toLocaleTimeString(
                        "en-IN",
                        { hour: "2-digit", minute: "2-digit" }
                      ),
                      accountNo,
                      customerName: c.name || "",
                      type: t.type || "deposit",
                      amount: amt,
                      agentName,
                      route: route || "",
                      timestamp: t.timestamp || Date.now(),
                      mode: t.mode || "cash",
                      method: t.method || "",
                    });
                  }
                });
              }

              customerList.push({
                id: `${agentName}_${accountNo}`,
                accountNo,
                name: c.name || "",
                mobile: c.mobileNumber || c.mobile || "",
                totalAmount: totalDeposits,
                withdrawnAmount: totalWithdrawals,
                agentName,
                route: route || "",
                createdAt: new Date(c.createdDate || c.createdAt || Date.now()).toLocaleDateString(),
              });
            });
          }
        });

        // Also fetch from customers node (for Android app data)
        const customersRef = ref(database, "customers");
        onValue(customersRef, (customerSnapshot) => {
          const androidCustomers = customerSnapshot.val() || {};
          
          Object.entries(androidCustomers).forEach(([customerId, customerData]) => {
            // Check if this customer is already in the list
            const existingCustomer = customerList.find(c => c.accountNo === customerData.accountNo);
            
            if (!existingCustomer && customerData.accountNo) {
              let totalDeposits = 0;
              let totalWithdrawals = 0;

              if (customerData.transactions) {
                Object.entries(customerData.transactions).forEach(([tid, t]) => {
                  if (typeof t === "object" && t.amount !== undefined) {
                    const amt = Number(t.amount) || 0;
                    if ((t.type || "deposit").toLowerCase() === "deposit") totalDeposits += amt;
                    else totalWithdrawals += amt;

                    let transactionDate = "";
                    if (t.date) {
                      transactionDate = t.date;
                    } else if (t.timestamp) {
                      if (typeof t.timestamp === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t.timestamp)) {
                        transactionDate = t.timestamp;
                      } else {
                        const dateObj = new Date(t.timestamp);
                        if (!isNaN(dateObj.getTime())) {
                          transactionDate = dateObj.toISOString().split("T")[0];
                        } else {
                          transactionDate = new Date().toISOString().split("T")[0];
                        }
                      }
                    } else {
                      transactionDate = new Date().toISOString().split("T")[0];
                    }

                    transactionList.push({
                      id: `android_${tid}`,
                      date: transactionDate,
                      time: new Date(t.timestamp || Date.now()).toLocaleTimeString(
                        "en-IN",
                        { hour: "2-digit", minute: "2-digit" }
                      ),
                      accountNo: customerData.accountNo,
                      customerName: customerData.name || "",
                      type: t.type || "deposit",
                      amount: amt,
                      agentName: customerData.agentName || "Android App",
                      route: customerData.route || "Mobile",
                      timestamp: t.timestamp || Date.now(),
                      mode: t.mode || "cash",
                      method: t.method || "",
                    });
                  }
                });
              }

              customerList.push({
                id: `android_${customerId}`,
                accountNo: customerData.accountNo,
                name: customerData.name || "",
                mobile: customerData.mobile || customerData.mobileNumber || "",
                totalAmount: totalDeposits,
                withdrawnAmount: totalWithdrawals,
                agentName: customerData.agentName || "Android App",
                route: customerData.route || "Mobile",
                createdAt: new Date(customerData.createdAt || customerData.createdDate || Date.now()).toLocaleDateString(),
              });
            }
          });

          // Update state with all data
          setCustomers(customerList);
          setTransactions(transactionList);
          setLoading(false);
        });
      });
    };

    fetchData();
  }, []);

  const generateDailyReportPDF = (selectedDate) => {
    // Filter transactions for the selected date
    const dateTransactions = transactions.filter(t => t.date === selectedDate);
    
    if (dateTransactions.length === 0) {
      alert('No transactions found for the selected date.');
      return;
    }

    // Create a new window with daily report
    const printWindow = window.open('', '_blank');
    const reportDate = new Date(selectedDate).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Calculate totals for the day
    const dayTotalDeposits = dateTransactions
      .filter(t => t.type === 'deposit')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const dayTotalWithdrawals = dateTransactions
      .filter(t => t.type === 'withdrawal')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const dayNetAmount = dayTotalDeposits - dayTotalWithdrawals;
    
    // Group transactions by payment mode
    const cashTransactions = dateTransactions.filter(t => t.mode === 'cash');
    const onlineTransactions = dateTransactions.filter(t => t.mode === 'online');
    const gpayTransactions = onlineTransactions.filter(t => t.method === 'gpay');
    const phonepayTransactions = onlineTransactions.filter(t => t.method === 'phonepay');

    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Daily Transaction Report - ${selectedDate}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #007bff; padding-bottom: 15px; }
          .date-title { color: #007bff; font-size: 28px; font-weight: bold; margin-bottom: 5px; }
          .report-subtitle { color: #666; font-size: 16px; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
          .summary-card { border: 2px solid #ddd; padding: 20px; border-radius: 10px; text-align: center; }
          .summary-card.deposits { border-color: #28a745; background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); }
          .summary-card.withdrawals { border-color: #dc3545; background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%); }
          .summary-card.net { border-color: #007bff; background: linear-gradient(135deg, #d1ecf1 0%, #bee5eb 100%); }
          .summary-card.count { border-color: #6f42c1; background: linear-gradient(135deg, #e2d9f3 0%, #d6c7f0 100%); }
          .summary-title { font-weight: bold; color: #666; margin-bottom: 8px; font-size: 14px; }
          .summary-value { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
          .summary-value.success { color: #28a745; }
          .summary-value.danger { color: #dc3545; }
          .summary-value.primary { color: #007bff; }
          .summary-value.purple { color: #6f42c1; }
          .mode-section { margin-bottom: 30px; }
          .mode-title { background: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; font-weight: bold; font-size: 18px; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #007bff; color: white; font-weight: bold; }
          tr:nth-child(even) { background-color: #f8f9fa; }
          .deposit-row { background-color: #d4edda !important; }
          .withdrawal-row { background-color: #f8d7da !important; }
          .mode-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
          .cash-badge { background-color: #6c757d; color: white; }
          .gpay-badge { background-color: #4285f4; color: white; }
          .phonepay-badge { background-color: #5f259f; color: white; }
          .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="date-title">📊 Daily Transaction Report</div>
          <div class="report-subtitle">${reportDate}</div>
          <div class="report-subtitle">Generated on: ${new Date().toLocaleString('en-IN')}</div>
        </div>
        
        <div class="summary-grid">
          <div class="summary-card deposits">
            <div class="summary-title">Total Deposits</div>
            <div class="summary-value success">₹${dayTotalDeposits.toLocaleString()}</div>
            <small>${dateTransactions.filter(t => t.type === 'deposit').length} transactions</small>
          </div>
          <div class="summary-card withdrawals">
            <div class="summary-title">Total Withdrawals</div>
            <div class="summary-value danger">₹${dayTotalWithdrawals.toLocaleString()}</div>
            <small>${dateTransactions.filter(t => t.type === 'withdrawal').length} transactions</small>
          </div>
          <div class="summary-card net">
            <div class="summary-title">Net Amount</div>
            <div class="summary-value primary">₹${dayNetAmount.toLocaleString()}</div>
            <small>${dayNetAmount >= 0 ? 'Positive' : 'Negative'} flow</small>
          </div>
          <div class="summary-card count">
            <div class="summary-title">Total Transactions</div>
            <div class="summary-value purple">${dateTransactions.length}</div>
            <small>All transactions</small>
          </div>
        </div>

        <div class="mode-section">
          <div class="mode-title">💰 Cash Transactions (${cashTransactions.length})</div>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Account No</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Agent</th>
                <th>Route</th>
              </tr>
            </thead>
            <tbody>`;

    cashTransactions.forEach(t => {
      htmlContent += `
        <tr class="${t.type === 'deposit' ? 'deposit-row' : 'withdrawal-row'}">
          <td>${t.time}</td>
          <td>${t.accountNo}</td>
          <td>${t.customerName}</td>
          <td><span class="mode-badge cash-badge">${t.type.toUpperCase()}</span></td>
          <td style="font-weight: bold; color: ${t.type === 'deposit' ? '#28a745' : '#dc3545'}">₹${t.amount.toLocaleString()}</td>
          <td>${t.agentName}</td>
          <td>${t.route}</td>
        </tr>`;
    });

    htmlContent += `
            </tbody>
          </table>
        </div>

        <div class="mode-section">
          <div class="mode-title">📱 GPay Transactions (${gpayTransactions.length})</div>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Account No</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Agent</th>
                <th>Route</th>
              </tr>
            </thead>
            <tbody>`;

    gpayTransactions.forEach(t => {
      htmlContent += `
        <tr class="${t.type === 'deposit' ? 'deposit-row' : 'withdrawal-row'}">
          <td>${t.time}</td>
          <td>${t.accountNo}</td>
          <td>${t.customerName}</td>
          <td><span class="mode-badge gpay-badge">${t.type.toUpperCase()}</span></td>
          <td style="font-weight: bold; color: ${t.type === 'deposit' ? '#28a745' : '#dc3545'}">₹${t.amount.toLocaleString()}</td>
          <td>${t.agentName}</td>
          <td>${t.route}</td>
        </tr>`;
    });

    htmlContent += `
            </tbody>
          </table>
        </div>

        <div class="mode-section">
          <div class="mode-title">📲 PhonePe Transactions (${phonepayTransactions.length})</div>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Account No</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Agent</th>
                <th>Route</th>
              </tr>
            </thead>
            <tbody>`;

    phonepayTransactions.forEach(t => {
      htmlContent += `
        <tr class="${t.type === 'deposit' ? 'deposit-row' : 'withdrawal-row'}">
          <td>${t.time}</td>
          <td>${t.accountNo}</td>
          <td>${t.customerName}</td>
          <td><span class="mode-badge phonepay-badge">${t.type.toUpperCase()}</span></td>
          <td style="font-weight: bold; color: ${t.type === 'deposit' ? '#28a745' : '#dc3545'}">₹${t.amount.toLocaleString()}</td>
          <td>${t.agentName}</td>
          <td>${t.route}</td>
        </tr>`;
    });

    htmlContent += `
            </tbody>
          </table>
        </div>
        
        <div class="footer">
          <p><strong>Pigmi Daily Transaction Report</strong></p>
          <p>Cash: ${cashTransactions.length} | GPay: ${gpayTransactions.length} | PhonePe: ${phonepayTransactions.length} | Total: ${dateTransactions.length} transactions</p>
          <p>Report generated from Pigmi Daily Reports on ${new Date().toLocaleString('en-IN')}</p>
        </div>
      </body>
      </html>`;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load then trigger print
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // 🔍 Filter customers
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.mobile.includes(searchTerm) ||
      c.accountNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.agentName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRoute = selectedRoute === "All Routes" || c.route === selectedRoute;
    return matchesSearch && matchesRoute;
  });

  // 📅 Filter transactions by selected date
  const dailyTransactions = transactions.filter((t) => t.date === selectedDate);

  // 🧾 Calculate totals
  const dailyTotalDeposits = dailyTransactions
    .filter((t) => t.type.toLowerCase() === "deposit")
    .reduce((sum, t) => sum + t.amount, 0);

  const dailyTotalWithdrawals = dailyTransactions
    .filter(
      (t) =>
        t.type.toLowerCase() === "withdraw" || t.type.toLowerCase() === "withdrawal"
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const dailyNetAmount = dailyTotalDeposits - dailyTotalWithdrawals;

  const allRoutes = ["All Routes", ...new Set(customers.map((c) => c.route).filter(Boolean))];

  // 🕒 Loading Spinner
  if (loading) {
    return (
      <div className="text-center py-5">
        <div
          className="spinner-border text-primary"
          style={{ width: "3rem", height: "3rem" }}
        ></div>
        <p className="mt-3 text-muted">Loading data from Firebase...</p>
      </div>
    );
  }

  // 🧭 UI
  return (
    <div className="dashboard-container">
      <Container fluid className="py-4">
        {/* 🧾 Page Header */}
        <div className="page-header mb-4">
          <h3>📊 Daily Report</h3>
          <p className="text-muted mb-0">All customers and daily transactions summary</p>
        </div>

          {/* 🔍 Filters */}
          <Row className="mb-3 g-5">
            <Col md={4}>
              <Form.Control
                type="text"
                placeholder="Search by name, mobile, account no..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Col>
            <Col md={4}>
              <Form.Select
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
              >
                {allRoutes.map((r, i) => (
                  <option key={i} value={r}>
                    {r}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Control
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </Col>
          </Row>

          {/* 👥 All Customers Table */}
          <Card className="mb-4 shadow-sm">
            <Card.Body>
              <h5 className="mb-3">All Customers</h5>
              <div className="table-responsive">
                <Table striped bordered hover>
                  <thead className="table-dark">
                    <tr>
                      <th>Account No</th>
                      <th>Name</th>
                      <th>Mobile</th>
                      <th>Deposit</th>
                      <th>Withdrawn</th>
                      <th>Balance</th>
                      <th>Agent</th>
                      <th>Route</th>
                      <th>Created Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((c) => (
                        <tr key={c.id}>
                          <td>{c.accountNo}</td>
                          <td>{c.name}</td>
                          <td>{c.mobile}</td>
                          <td className="text-success">
                            ₹{c.totalAmount.toLocaleString("en-IN")}
                          </td>
                          <td className="text-danger">
                            ₹{c.withdrawnAmount.toLocaleString("en-IN")}
                          </td>
                          <td className="text-primary fw-bold">
                            ₹{(c.totalAmount - c.withdrawnAmount).toLocaleString(
                              "en-IN"
                            )}
                          </td>
                          <td>{c.agentName}</td>
                          <td>{c.route}</td>
                          <td>{c.createdAt}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="9" className="text-center text-muted">
                          No customers found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>

          {/* 💵 Daily Transactions Table */}
          <Card className="shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">
                  Transactions for {new Date(selectedDate).toLocaleDateString("en-GB")}
                </h5>
                {dailyTransactions.length > 0 && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => generateDailyReportPDF(selectedDate)}
                    className="d-flex align-items-center gap-1"
                  >
                    <Download size={16} />
                    Download PDF
                  </Button>
                )}
              </div>
              <div className="mb-3">
                <strong className="text-success">Total Deposits:</strong> ₹{" "}
                {dailyTotalDeposits.toLocaleString("en-IN")} &nbsp; | &nbsp;
                <strong className="text-danger">Total Withdrawals:</strong> ₹{" "}
                {dailyTotalWithdrawals.toLocaleString("en-IN")} &nbsp; | &nbsp;
                <strong className="text-primary">Net:</strong> ₹{" "}
                {dailyNetAmount.toLocaleString("en-IN")}
              </div>
              {dailyTransactions.length > 0 ? (
                <div className="table-responsive">
                  <Table striped bordered hover>
                    <thead className="table-dark">
                      <tr>
                        <th>#</th>
                        <th>Time</th>
                        <th>Account No</th>
                        <th>Customer</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Mode</th>
                        <th>Agent</th>
                        <th>Route</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyTransactions.map((t, idx) => (
                        <tr key={t.id}>
                          <td>{idx + 1}</td>
                          <td>{t.time}</td>
                          <td>{t.accountNo}</td>
                          <td>{t.customerName}</td>
                          <td>
                            <Badge bg={t.type.toLowerCase() === "deposit" ? "success" : "danger"}>
                              {t.type.toUpperCase()}
                            </Badge>
                          </td>
                          <td
                            className={
                              t.type.toLowerCase() === "deposit"
                                ? "text-success"
                                : "text-danger"
                            }
                          >
                            {t.type.toLowerCase() === "deposit" ? "+" : "-"}₹{" "}
                            {t.amount.toLocaleString("en-IN")}
                          </td>
                          <td>
                            {t.mode === "online" ? (
                              <div className="d-flex align-items-center">
                                <div style={{
                                  width: '16px',
                                  height: '16px',
                                  backgroundColor: t.method === 'gpay' ? '#4285f4' : '#5f259f',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white',
                                  fontSize: '8px',
                                  fontWeight: 'bold',
                                  marginRight: '4px'
                                }}>
                                  {t.method === 'gpay' ? 'G' : 'P'}
                                </div>
                                <Badge bg="info">
                                  {t.method === 'gpay' ? 'GPAY' : 'PHONEPAY'}
                                </Badge>
                              </div>
                            ) : (
                              <div className="d-flex align-items-center">
                                <CreditCard size={12} className="me-1 text-secondary" />
                                <Badge bg="secondary">CASH</Badge>
                              </div>
                            )}
                          </td>
                          <td>{t.agentName}</td>
                          <td>{t.route}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted mb-0">No transactions found for this date.</p>
              )}
            </Card.Body>
          </Card>
        </Container>
    </div>
  );
};

export default DailyReport;