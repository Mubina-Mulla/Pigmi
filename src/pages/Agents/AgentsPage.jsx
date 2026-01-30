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
import { ref, onValue, set, update, remove, get } from "firebase/database";
import { database } from "../../firebase";
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Eye,
  EyeOff,
  Search
} from "react-feather";

function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddAgentModal, setShowAddAgentModal] = useState(false);
  const [showEditAgentModal, setShowEditAgentModal] = useState(false);
  const [showAgentCustomersModal, setShowAgentCustomersModal] = useState(false);
  const [selectedAgentForCustomers, setSelectedAgentForCustomers] = useState(null);
  const [showViewRoutesModal, setShowViewRoutesModal] = useState(false);
  const [selectedAgentForRoutes, setSelectedAgentForRoutes] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [routeInput, setRouteInput] = useState('');

  const [newAgent, setNewAgent] = useState({
    name: "",
    mobile: "",
    password: "",
    route: [],
  });

  const [editAgent, setEditAgent] = useState({
    name: "",
    mobile: "",
    password: "",
    route: [],
  });

  useEffect(() => {
    const agentsRef = ref(database, "agents");
    const customersRef = ref(database, "customers");
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
          // Normalize mobile number field - handle different field names
          const mobile = customerInfo.mobile || customerInfo.mobileNumber || customerInfo.phone || "";
          
          customerList.push({
            id: customerId,
            accountNo: customerInfo.accountNo || customerId,
            name: customerInfo.name || "Unknown",
            mobile: mobile,
            totalAmount: totalAmount,
            withdrawnAmount: withdrawnAmount,
            balance: totalAmount - withdrawnAmount,
            agentName: customerInfo.agentName || "",
            route: customerInfo.route || ""
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

  const agentStats = {};
  agents.forEach(agent => {
    const agentCustomers = customers.filter(c => c.agentName === agent.name);
    const totalDeposits = agentCustomers.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
    const totalWithdrawn = agentCustomers.reduce((sum, c) => sum + (c.withdrawnAmount || 0), 0);
    agentStats[agent.name] = {
      customersCount: agentCustomers.length,
      totalAmount: totalDeposits,
      withdrawnAmount: totalWithdrawn,
      netBalance: totalDeposits - totalWithdrawn
    };
  });

  const handleAddAgent = async (e) => {
    e.preventDefault();
    const agentData = {
      mobile: newAgent.mobile,
      password: newAgent.password,
      route: newAgent.route
    };
    await set(ref(database, `agents/${newAgent.name}`), agentData);
    setShowAddAgentModal(false);
    setNewAgent({ name: "", mobile: "", password: "", route: [] });
    setRouteInput('');
  };

  const handleAddRouteToNewAgent = (e) => {
    if (e.key === 'Enter' && routeInput.trim()) {
      e.preventDefault();
      const newRoutes = routeInput.split(',').map(r => r.trim()).filter(r => r);
      const currentRoutes = Array.isArray(newAgent.route) ? newAgent.route : [];
      const uniqueRoutes = [...new Set([...currentRoutes, ...newRoutes])];
      setNewAgent({ ...newAgent, route: uniqueRoutes });
      setRouteInput('');
    }
  };

  const handleRemoveRouteFromNewAgent = (routeToRemove) => {
    const updatedRoutes = newAgent.route.filter(r => r !== routeToRemove);
    setNewAgent({ ...newAgent, route: updatedRoutes });
  };

  const openEditModal = (agent) => {
    setSelectedAgent(agent);
    setEditAgent({
      name: agent.name,
      mobile: agent.mobile,
      password: agent.password,
      route: agent.route
    });
    setRouteInput('');
    setShowEditAgentModal(true);
  };

  const handleAddRoute = (e) => {
    if (e.key === 'Enter' && routeInput.trim()) {
      e.preventDefault();
      const newRoutes = routeInput.split(',').map(r => r.trim()).filter(r => r);
      const currentRoutes = Array.isArray(editAgent.route) ? editAgent.route : [];
      const uniqueRoutes = [...new Set([...currentRoutes, ...newRoutes])];
      setEditAgent({ ...editAgent, route: uniqueRoutes });
      setRouteInput('');
    }
  };

  const handleRemoveRoute = (routeToRemove) => {
    const updatedRoutes = editAgent.route.filter(r => r !== routeToRemove);
    setEditAgent({ ...editAgent, route: updatedRoutes });
  };

  const handleUpdateAgent = async (e) => {
    e.preventDefault();
    const updates = {};
    updates[`agents/${editAgent.name}/mobile`] = editAgent.mobile;
    updates[`agents/${editAgent.name}/password`] = editAgent.password;
    updates[`agents/${editAgent.name}/route`] = editAgent.route;
    await update(ref(database), updates);
    setShowEditAgentModal(false);
    setSelectedAgent(null);
  };

  const handleDeleteAgent = async (agentName) => {
    const agentCustomers = customers.filter(c => c.agentName === agentName);
    const customerCount = agentCustomers.length;
    
    const confirmMessage = customerCount > 0
      ? `Are you sure you want to delete agent ${agentName}?\n\nThis will permanently delete:\n- Agent ${agentName}\n- ${customerCount} customer(s): ${agentCustomers.map(c => c.name).join(', ')}\n- All their transactions\n- All summary and count data`
      : `Are you sure you want to delete agent ${agentName} and all related data?`;
    
    if (window.confirm(confirmMessage)) {
      try {
        console.log('Starting deletion process for agent:', agentName);
        console.log('Customers to delete:', agentCustomers);
        
        // Delete all customers and their related data
        for (const customer of agentCustomers) {
          const customerId = customer.id;
          const accountNo = customer.accountNo || customerId;
          
          console.log('Processing customer:', customer.name, accountNo);
          
          // Delete customer transactions
          await remove(ref(database, `transactions/${accountNo}`));
          console.log('✓ Deleted transactions for:', accountNo);
          
          // Delete customer transaction count
          await remove(ref(database, `customerTransactionCount/${accountNo}`));
          console.log('✓ Deleted customerTransactionCount for:', accountNo);
          
          // Delete customer data
          await remove(ref(database, `customers/${customerId}`));
          console.log('✓ Deleted customer:', customerId);
        }
        
        // Delete agent from main agents node
        await remove(ref(database, `agents/${agentName}`));
        console.log('✓ Deleted agent from agents node:', agentName);
        
        // Delete agent customer count
        await remove(ref(database, `agentCustomerCount/${agentName}`));
        console.log('✓ Deleted agentCustomerCount for:', agentName);
        
        // Delete agent daily transaction count
        await remove(ref(database, `agentDailyTransactionCount/${agentName}`));
        console.log('✓ Deleted agentDailyTransactionCount for:', agentName);
        
        // Delete agent summary
        await remove(ref(database, `agentSummary/${agentName}`));
        console.log('✓ Deleted agentSummary for:', agentName);
        
        // Update global count (decrement by number of customers deleted)
        const globalCountRef = ref(database, 'globalCount');
        const globalCountSnapshot = await get(globalCountRef);
        if (globalCountSnapshot.exists()) {
          const currentCount = globalCountSnapshot.val() || 0;
          const newCount = Math.max(0, currentCount - customerCount);
          await set(globalCountRef, newCount);
          console.log('✓ Updated globalCount:', currentCount, '→', newCount);
        }
        
        console.log('✅ Deletion complete!');
        alert(`Successfully deleted:\n- Agent: ${agentName}\n- Customers: ${customerCount}\n- All related data from Firebase`);
      } catch (error) {
        console.error('❌ Error during deletion:', error);
        alert('An error occurred while deleting the agent and associated data: ' + error.message);
      }
    }
  };

  const cleanupOrphanedData = async () => {
    if (!window.confirm('This will remove all orphaned data from Firebase (agents without valid data, empty nodes, etc.). Continue?')) {
      return;
    }

    try {
      console.log('Starting cleanup of orphaned data...');
      
      // List of unwanted agent names to remove
      const unwantedAgents = ['Avantika', 'Shan', 'avantika', 'shan'];
      
      // Get all nodes to check
      const agentCustomerCountSnapshot = await get(ref(database, 'agentCustomerCount'));
      const agentDailyTransactionCountSnapshot = await get(ref(database, 'agentDailyTransactionCount'));
      const agentSummarySnapshot = await get(ref(database, 'agentSummary'));
      const agentsSnapshot = await get(ref(database, 'agents'));
      
      const validAgentNames = new Set(agents.map(a => a.name));
      let deletedCount = 0;
      
      // First, remove unwanted agents from main agents node
      if (agentsSnapshot.exists()) {
        const data = agentsSnapshot.val();
        for (const agentName in data) {
          if (unwantedAgents.includes(agentName) || !validAgentNames.has(agentName)) {
            await remove(ref(database, `agents/${agentName}`));
            console.log('✓ Removed unwanted agent:', agentName);
            deletedCount++;
          }
        }
      }
      
      // Clean agentCustomerCount
      if (agentCustomerCountSnapshot.exists()) {
        const data = agentCustomerCountSnapshot.val();
        for (const agentName in data) {
          if (unwantedAgents.includes(agentName) || !validAgentNames.has(agentName)) {
            await remove(ref(database, `agentCustomerCount/${agentName}`));
            console.log('✓ Removed orphaned agentCustomerCount:', agentName);
            deletedCount++;
          }
        }
      }
      
      // Clean agentDailyTransactionCount
      if (agentDailyTransactionCountSnapshot.exists()) {
        const data = agentDailyTransactionCountSnapshot.val();
        for (const agentName in data) {
          if (unwantedAgents.includes(agentName) || !validAgentNames.has(agentName)) {
            await remove(ref(database, `agentDailyTransactionCount/${agentName}`));
            console.log('✓ Removed orphaned agentDailyTransactionCount:', agentName);
            deletedCount++;
          }
        }
      }
      
      // Clean agentSummary
      if (agentSummarySnapshot.exists()) {
        const data = agentSummarySnapshot.val();
        for (const agentName in data) {
          if (unwantedAgents.includes(agentName) || !validAgentNames.has(agentName)) {
            await remove(ref(database, `agentSummary/${agentName}`));
            console.log('✓ Removed orphaned agentSummary:', agentName);
            deletedCount++;
          }
        }
      }
      
      console.log('✅ Cleanup complete!');
      alert(`Cleanup complete! Removed ${deletedCount} orphaned data entries.\nRemoved agents: ${unwantedAgents.join(', ')}`);
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
      alert('An error occurred during cleanup: ' + error.message);
    }
  };

  const handleAgentClick = (agentName) => {
    const agentCustomers = customers.filter(c => c.agentName === agentName);
    const agentInfo = agents.find(a => a.name === agentName);
    setSelectedAgentForCustomers({
      name: agentName,
      customers: agentCustomers,
      info: agentInfo,
      stats: agentStats[agentName] || { customersCount: 0, totalAmount: 0, withdrawnAmount: 0 }
    });
    setShowAgentCustomersModal(true);
  };

  const handleViewRoutes = (agent) => {
    setSelectedAgentForRoutes(agent);
    setShowViewRoutesModal(true);
  };

  if (loading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" style={{ width: "3rem", height: "3rem" }}></div>
          <p className="mt-3 text-muted">Loading agents...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <div className="page-header mb-4">
        <h3 className="fw-bold">
          <Users size={28} className="me-2" />
          Agent Management
        </h3>
        <p className="text-muted mb-0">Manage agents, routes, and assignments</p>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-3">
          <Row className="mb-3 g-2">
            <Col md={7}>
              <InputGroup>
                <InputGroup.Text><Search size={16} /></InputGroup.Text>
                <Form.Control 
                  placeholder="Search by agent name, mobile, or route..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={5} className="d-flex justify-content-end gap-2">
              <Button variant="warning" onClick={cleanupOrphanedData} size="sm">
                <Trash2 size={14} className="me-1" />
                Cleanup Orphaned Data
              </Button>
              <Button variant="primary" onClick={() => setShowAddAgentModal(true)} size="sm">
                <Plus size={14} className="me-1" />
                Add New Agent
              </Button>
            </Col>
          </Row>

          <div className="table-responsive">
            <Table hover>
              <thead className="bg-light">
                <tr>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Route</th>
                  <th>Customers</th>
                  <th>Total Deposits</th>
                  <th>Total Withdrawn</th>
                  <th>Net Balance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents.filter(agent => {
                  const search = searchTerm.toLowerCase();
                  const routeString = Array.isArray(agent.route) ? agent.route.join(', ').toLowerCase() : '';
                  return agent.name?.toLowerCase().includes(search) ||
                         agent.mobile?.includes(search) ||
                         routeString.includes(search);
                }).length > 0 ? agents.filter(agent => {
                  const search = searchTerm.toLowerCase();
                  const routeString = Array.isArray(agent.route) ? agent.route.join(', ').toLowerCase() : '';
                  return agent.name?.toLowerCase().includes(search) ||
                         agent.mobile?.includes(search) ||
                         routeString.includes(search);
                }).map((agent, index) => {
                  const stats = agentStats[agent.name] || {};
                  return (
                    <tr key={agent.name} className="align-middle">
                      <td className="fw-semibold">{agent.name}</td>
                      <td>{agent.mobile}</td>
                      <td>
                        <Button variant="outline-info" size="sm" onClick={() => handleViewRoutes(agent)}>
                          <Eye size={12} className="me-1" />
                          View Routes
                        </Button>
                      </td>
                      <td>
                        <Button variant="link" onClick={() => handleAgentClick(agent.name)} className="p-0">
                          <Badge bg="primary">{stats.customersCount || 0}</Badge>
                        </Button>
                      </td>
                      <td className="text-success fw-bold">₹{(stats.totalAmount || 0).toLocaleString()}</td>
                      <td className="text-danger fw-bold">₹{(stats.withdrawnAmount || 0).toLocaleString()}</td>
                      <td className="text-primary fw-bold">₹{(stats.netBalance || 0).toLocaleString()}</td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button variant="outline-warning" size="sm" onClick={() => openEditModal(agent)} title="Edit Agent">
                            <Edit size={14} />
                          </Button>
                          <Button variant="outline-danger" size="sm" onClick={() => handleDeleteAgent(agent.name)} title="Delete Agent">
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="9" className="text-center text-muted py-4">
                      <Users size={32} className="mb-2" /><br />
                      {searchTerm ? 'No agents found matching your search' : 'No agents found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Add Agent Modal */}
      <Modal show={showAddAgentModal} onHide={() => setShowAddAgentModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add New Agent</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAddAgent}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Agent Name</Form.Label>
              <Form.Control value={newAgent.name} onChange={e => setNewAgent({ ...newAgent, name: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Mobile Number</Form.Label>
              <Form.Control value={newAgent.mobile} onChange={e => setNewAgent({ ...newAgent, mobile: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control type="password" value={newAgent.password} onChange={e => setNewAgent({ ...newAgent, password: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Route</Form.Label>
              <div className="mb-2 d-flex flex-wrap gap-2">
                {Array.isArray(newAgent.route) && newAgent.route.map((route, index) => (
                  <Badge 
                    key={index} 
                    bg="success" 
                    className="d-flex align-items-center gap-2 py-2 px-3"
                    style={{ fontSize: '14px' }}
                  >
                    {route}
                    <span 
                      onClick={() => handleRemoveRouteFromNewAgent(route)}
                      style={{ cursor: 'pointer', fontSize: '18px', lineHeight: '1' }}
                      title="Remove route"
                    >
                      ×
                    </span>
                  </Badge>
                ))}
              </div>
              <InputGroup>
                <Form.Control 
                  placeholder="Type route and press Enter (comma-separated for multiple)"
                  value={routeInput}
                  onChange={(e) => setRouteInput(e.target.value)}
                  onKeyDown={handleAddRouteToNewAgent}
                />
                <Button 
                  variant="primary" 
                  onClick={() => {
                    if (routeInput.trim()) {
                      const newRoutes = routeInput.split(',').map(r => r.trim()).filter(r => r);
                      const currentRoutes = Array.isArray(newAgent.route) ? newAgent.route : [];
                      const uniqueRoutes = [...new Set([...currentRoutes, ...newRoutes])];
                      setNewAgent({ ...newAgent, route: uniqueRoutes });
                      setRouteInput('');
                    }
                  }}
                  disabled={!routeInput.trim()}
                >
                  OK
                </Button>
              </InputGroup>
              <Form.Text className="text-muted">
                Press Enter or click OK to add routes. Click × on a tag to remove it.
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAddAgentModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Add Agent</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Edit Agent Modal */}
      <Modal show={showEditAgentModal} onHide={() => setShowEditAgentModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Agent</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUpdateAgent}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Agent Name</Form.Label>
              <Form.Control value={editAgent.name} disabled />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Mobile Number</Form.Label>
              <Form.Control value={editAgent.mobile} onChange={e => setEditAgent({ ...editAgent, mobile: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <InputGroup>
                <Form.Control 
                  type={showPassword ? "text" : "password"} 
                  value={editAgent.password} 
                  onChange={e => setEditAgent({ ...editAgent, password: e.target.value })} 
                  required 
                />
                <InputGroup.Text 
                  onClick={() => setShowPassword(!showPassword)} 
                  style={{ cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </InputGroup.Text>
              </InputGroup>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Route</Form.Label>
              <div className="mb-2 d-flex flex-wrap gap-2">
                {Array.isArray(editAgent.route) && editAgent.route.map((route, index) => (
                  <Badge 
                    key={index} 
                    bg="success" 
                    className="d-flex align-items-center gap-2 py-2 px-3"
                    style={{ fontSize: '14px' }}
                  >
                    {route}
                    <span 
                      onClick={() => handleRemoveRoute(route)}
                      style={{ cursor: 'pointer', fontSize: '18px', lineHeight: '1' }}
                      title="Remove route"
                    >
                      ×
                    </span>
                  </Badge>
                ))}
              </div>
              <InputGroup>
                <Form.Control 
                  placeholder="Type route and press Enter (comma-separated for multiple)"
                  value={routeInput}
                  onChange={(e) => setRouteInput(e.target.value)}
                  onKeyDown={handleAddRoute}
                />
                <Button 
                  variant="primary" 
                  onClick={() => {
                    if (routeInput.trim()) {
                      const newRoutes = routeInput.split(',').map(r => r.trim()).filter(r => r);
                      const currentRoutes = Array.isArray(editAgent.route) ? editAgent.route : [];
                      const uniqueRoutes = [...new Set([...currentRoutes, ...newRoutes])];
                      setEditAgent({ ...editAgent, route: uniqueRoutes });
                      setRouteInput('');
                    }
                  }}
                  disabled={!routeInput.trim()}
                >
                  OK
                </Button>
              </InputGroup>
              <Form.Text className="text-muted">
                Press Enter or click OK to add routes. Click × on a tag to remove it.
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditAgentModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Update Agent</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Agent Customers Modal */}
      <Modal show={showAgentCustomersModal} onHide={() => setShowAgentCustomersModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Agent Customers</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedAgentForCustomers && (
            <div>
              <h5>{selectedAgentForCustomers.name}</h5>
              <p className="text-muted">Total Customers: {selectedAgentForCustomers.stats.customersCount}</p>
              <Table striped size="sm">
                <thead>
                  <tr>
                    <th>Account No</th>
                    <th>Name</th>
                    <th>Mobile</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedAgentForCustomers.customers.map(c => (
                    <tr key={c.id}>
                      <td>{c.accountNo}</td>
                      <td>{c.name}</td>
                      <td>{c.mobile || c.mobileNumber || c.phone || 'N/A'}</td>
                      <td>₹{(c.balance || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAgentCustomersModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>

      {/* View Routes Modal */}
      <Modal show={showViewRoutesModal} onHide={() => setShowViewRoutesModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Agent Routes</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedAgentForRoutes && (
            <div>
              <h5>{selectedAgentForRoutes.name}</h5>
              <p className="text-muted">Assigned Routes:</p>
              {Array.isArray(selectedAgentForRoutes.route) && selectedAgentForRoutes.route.length > 0 ? (
                <ul>
                  {selectedAgentForRoutes.route.map((r, i) => (
                    <li key={i}><Badge bg="info">{r}</Badge></li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted">No routes assigned</p>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewRoutesModal(false)}>Close</Button>
          <Button variant="primary" onClick={() => {
            setShowViewRoutesModal(false);
            openEditModal(selectedAgentForRoutes);
          }}>Edit Routes</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default AgentsPage;
