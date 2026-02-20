import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { toast } from 'react-toastify';

function AgentsPage() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddAgentModal, setShowAddAgentModal] = useState(false);
  const [showEditAgentModal, setShowEditAgentModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showAgentCustomersModal, setShowAgentCustomersModal] = useState(false);
  const [selectedAgentForCustomers, setSelectedAgentForCustomers] = useState(null);
  const [showViewRoutesModal, setShowViewRoutesModal] = useState(false);
  const [selectedAgentForRoutes, setSelectedAgentForRoutes] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [routeInput, setRouteInput] = useState('');
  const [routeSearchTerm, setRouteSearchTerm] = useState('');
  const [editRouteSearchTerm, setEditRouteSearchTerm] = useState('');
  
  // Route management states
  const [routes, setRoutes] = useState([]); // List of all routes with villages
  const [showManageRoutesModal, setShowManageRoutesModal] = useState(false);
  const [selectedRouteForEdit, setSelectedRouteForEdit] = useState(null);
  const [newVillage, setNewVillage] = useState('');
  const [selectedRoutesForAgent, setSelectedRoutesForAgent] = useState([]);
  const [newRouteName, setNewRouteName] = useState('');
  const [tempRoutes, setTempRoutes] = useState([]); // Temporary routes being created in modal
  const [showEditRouteConfirm, setShowEditRouteConfirm] = useState(false);
  const [routeToEdit, setRouteToEdit] = useState(null);
  const [editingRouteName, setEditingRouteName] = useState('');
  const [editingRouteVillages, setEditingRouteVillages] = useState([]);
  const [showEditRouteModal, setShowEditRouteModal] = useState(false);

  const [newAgent, setNewAgent] = useState({
    name: "",
    address: "",
    mobile: "",
    password: "",
    route: [],
  });

  const [editAgent, setEditAgent] = useState({
    name: "",
    address: "",
    mobile: "",
    password: "",
    route: [],
  });

  useEffect(() => {
    const agentsRef = ref(database, "agents");
    const customersRef = ref(database, "customers");
    const transactionsRef = ref(database, "transactions");
    const routesRef = ref(database, "routes");

    // Fetch routes
    onValue(routesRef, (snapshot) => {
      const routeData = snapshot.val() || {};
      console.log('Routes from Firebase:', routeData);
      const routeList = [];
      Object.entries(routeData).forEach(([routeName, villagesData]) => {
        // villagesData is directly an array or object with numeric keys
        const villages = Array.isArray(villagesData) 
          ? villagesData 
          : Object.values(villagesData || {});
        routeList.push({
          name: routeName,
          villages: villages
        });
      });
      console.log('Processed route list:', routeList);
      setRoutes(routeList);
    });

    onValue(agentsRef, (snapshot) => {
      const agentData = snapshot.val() || {};
      const agentList = [];
      Object.entries(agentData).forEach(([agentName, agentInfo]) => {
        if (agentInfo) {
          agentList.push({
            name: agentName,
            address: agentInfo.address || "",
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
          const totalAmount = parseInt(customerInfo.totalAmount) || 0;
          const withdrawnAmount = parseInt(customerInfo.withdrawnAmount) || 0;
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
      address: newAgent.address,
      mobile: newAgent.mobile,
      password: newAgent.password,
      route: newAgent.route
    };
    await set(ref(database, `agents/${newAgent.name}`), agentData);
    toast.success(`Agent ${newAgent.name} added successfully!`);
    setShowAddAgentModal(false);
    setNewAgent({ name: "", address: "", mobile: "", password: "", route: [] });
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
    console.log('Opening edit modal for agent:', agent);
    setSelectedAgent(agent);
    setEditAgent({
      name: agent.name,
      address: agent.address || "",
      mobile: agent.mobile,
      password: agent.password,
      route: agent.route || []
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
    
    if (!selectedAgent) {
      toast.error('No agent selected for update');
      return;
    }
    
    const oldName = selectedAgent.name;
    const newName = editAgent.name.trim();
    
    if (!newName) {
      toast.error('Agent name cannot be empty');
      return;
    }
    
    // If name changed, we need to handle it differently
    if (oldName !== newName) {
      // Check if new name already exists
      const agentExists = agents.some(agent => agent.name === newName && agent.name !== oldName);
      if (agentExists) {
        toast.error('An agent with this name already exists');
        return;
      }
      
      try {
        // Create new agent with new name
        const agentData = {
          address: editAgent.address,
          mobile: editAgent.mobile,
          password: editAgent.password,
          route: editAgent.route
        };
        await set(ref(database, `agents/${newName}`), agentData);
        
        // Update all customers assigned to this agent
        const updates = {};
        customers.forEach(customer => {
          if (customer.agentName === oldName) {
            updates[`customers/${customer.id}/agentName`] = newName;
          }
        });
        
        if (Object.keys(updates).length > 0) {
          await update(ref(database), updates);
        }
        
        // Delete old agent
        await remove(ref(database, `agents/${oldName}`));
        
        toast.success(`Agent name updated from "${oldName}" to "${newName}" successfully!`);
      } catch (error) {
        console.error('Error updating agent:', error);
        toast.error('Failed to update agent name');
        return;
      }
    } else {
      // Just update the existing agent data
      const updates = {};
      updates[`agents/${editAgent.name}/address`] = editAgent.address;
      updates[`agents/${editAgent.name}/mobile`] = editAgent.mobile;
      updates[`agents/${editAgent.name}/password`] = editAgent.password;
      updates[`agents/${editAgent.name}/route`] = editAgent.route;
      await update(ref(database), updates);
      toast.success(`Agent ${editAgent.name} updated successfully!`);
    }
    
    setShowEditAgentModal(false);
    setSelectedAgent(null);
  };

  // Route Management Functions
  const handleCreateRoute = () => {
    if (!newRouteName.trim()) {
      toast.error('Please enter a route name');
      return;
    }

    // Check if route already exists in saved routes
    if (routes.some(r => r.name === newRouteName.trim())) {
      toast.error('Route name already exists');
      return;
    }
    
    // Only allow one route to be created at a time
    setTempRoutes([{ name: newRouteName.trim(), villages: [] }]);
    setSelectedRouteForEdit(newRouteName.trim());
    toast.success(`${newRouteName.trim()} created! Add villages and click Save`);
    setNewRouteName('');
  };

  const handleAddVillageToTemp = (routeName) => {
    if (!newVillage.trim()) {
      toast.error('Please enter a village name');
      return;
    }
    
    const updatedRoutes = tempRoutes.map(route => {
      if (route.name === routeName) {
        return { ...route, villages: [...route.villages, newVillage.trim()] };
      }
      return route;
    });
    
    setTempRoutes(updatedRoutes);
    setNewVillage('');
    toast.success(`Village "${newVillage}" added!`);
  };

  const handleRemoveVillageFromTemp = (routeName, village) => {
    const updatedRoutes = tempRoutes.map(route => {
      if (route.name === routeName) {
        return { ...route, villages: route.villages.filter(v => v !== village) };
      }
      return route;
    });
    setTempRoutes(updatedRoutes);
  };

  const handleSaveAllRoutes = async () => {
    if (tempRoutes.length === 0) {
      toast.error('No routes to save');
      return;
    }

    const route = tempRoutes[0]; // Only one route at a time
    
    if (route.villages.length === 0) {
      toast.error('Please add at least one village before saving');
      return;
    }

    try {
      // Save villages as array directly under route
      await set(ref(database, `routes/${route.name}`), route.villages);
      
      // Close modal and reset state
      setShowManageRoutesModal(false);
      setTempRoutes([]);
      setNewRouteName('');
      setNewVillage('');
      setSelectedRouteForEdit(null);
      
      // Show success toast after modal closes
      setTimeout(() => {
        toast.success(`Route "${route.name}" saved successfully!`);
      }, 100);
    } catch (error) {
      console.error('Error saving routes:', error);
      toast.error('Error saving routes: ' + error.message);
    }
  };

  const handleAddVillage = async (routeName) => {
    if (!newVillage.trim()) return;
    
    const route = routes.find(r => r.name === routeName);
    const updatedVillages = [...(route?.villages || []), newVillage.trim()];
    
    await update(ref(database), {
      [`routes/${routeName}/villages`]: updatedVillages
    });
    
    setNewVillage('');
    toast.success(`Village "${newVillage}" added to ${routeName}!`);
  };

  const handleRemoveVillage = async (routeName, village) => {
    const route = routes.find(r => r.name === routeName);
    const updatedVillages = route.villages.filter(v => v !== village);
    
    await update(ref(database), {
      [`routes/${routeName}/villages`]: updatedVillages
    });
    
    toast.success(`Village "${village}" removed from ${routeName}!`);
  };

  const handleDeleteRoute = async (routeName) => {
    if (window.confirm(`Delete ${routeName} and all its villages?`)) {
      await remove(ref(database, `routes/${routeName}`));
      toast.success(`${routeName} deleted successfully!`);
    }
  };

  // Edit existing route functions
  const handleClickExistingRoute = (route) => {
    setRouteToEdit(route);
    setShowEditRouteConfirm(true);
  };

  const handleConfirmEditRoute = () => {
    setEditingRouteName(routeToEdit.name);
    setEditingRouteVillages([...routeToEdit.villages]);
    setShowEditRouteConfirm(false);
    setShowManageRoutesModal(false);
    setShowEditRouteModal(true);
  };

  const handleAddVillageToEdit = () => {
    if (!newVillage.trim()) {
      toast.error('Please enter a village name');
      return;
    }
    if (editingRouteVillages.includes(newVillage.trim())) {
      toast.error('Village already exists');
      return;
    }
    setEditingRouteVillages([...editingRouteVillages, newVillage.trim()]);
    setNewVillage('');
    toast.success(`Village "${newVillage}" added!`);
  };

  const handleRemoveVillageFromEdit = (village) => {
    setEditingRouteVillages(editingRouteVillages.filter(v => v !== village));
  };

  const handleSaveEditedRoute = async () => {
    if (!editingRouteName.trim()) {
      toast.error('Route name cannot be empty');
      return;
    }
    if (editingRouteVillages.length === 0) {
      toast.error('Please add at least one village');
      return;
    }

    try {
      // If route name changed, delete old route and create new one
      if (editingRouteName !== routeToEdit.name) {
        await remove(ref(database, `routes/${routeToEdit.name}`));
      }

      // Save villages as array directly under route
      await set(ref(database, `routes/${editingRouteName}`), editingRouteVillages);

      // Update agents that have the old route name
      if (editingRouteName !== routeToEdit.name) {
        const agentsToUpdate = agents.filter(agent => agent.route.includes(routeToEdit.name));
        for (const agent of agentsToUpdate) {
          const updatedRoutes = agent.route.map(r => r === routeToEdit.name ? editingRouteName : r);
          await update(ref(database, `agents/${agent.name}`), {
            route: updatedRoutes
          });
        }
      }

      setShowEditRouteModal(false);
      setShowManageRoutesModal(true);
      setRouteToEdit(null);
      setEditingRouteName('');
      setEditingRouteVillages([]);
      setNewVillage('');

      setTimeout(() => {
        toast.success(`Route updated successfully!`);
      }, 100);
    } catch (error) {
      console.error('Error updating route:', error);
      toast.error('Failed to update route');
    }
  };

  const handleDeleteAgent = async (agentName) => {
    const agentCustomers = customers.filter(c => c.agentName === agentName);
    const customerCount = agentCustomers.length;
    
    const confirmMessage = customerCount > 0
      ? `Are you sure you want to delete agent ${agentName}?\n\nThis will move the agent to Recycle Bin for 5 days.\n\nNote: ${customerCount} customer(s) currently assigned to this agent will remain in the system.`
      : `Are you sure you want to delete agent ${agentName}?\n\nThis will move the agent to Recycle Bin for 5 days.`;
    
    if (window.confirm(confirmMessage)) {
      try {
        // Get agent data
        const agentDataSnapshot = await get(ref(database, `agents/${agentName}`));
        
        if (agentDataSnapshot.exists()) {
          // Prepare deleted agent object
          const deletedAgent = {
            data: {
              name: agentName,
              ...agentDataSnapshot.val()
            },
            deletedAt: Date.now(),
            deletedBy: 'admin',
            customerCount: customerCount
          };
          
          // Move to recycle bin
          await set(ref(database, `deletedAgents/${agentName}`), deletedAgent);
        }
        
        // Delete agent from main agents node
        await remove(ref(database, `agents/${agentName}`));
        
        // Delete agent customer count
        await remove(ref(database, `agentCustomerCount/${agentName}`));
        
        // Delete agent daily transaction count
        await remove(ref(database, `agentDailyTransactionCount/${agentName}`));
        
        // Delete agent summary
        await remove(ref(database, `agentSummary/${agentName}`));
        
        toast.success(`Agent ${agentName} moved to Recycle Bin. ${customerCount} customer(s) remain in the system.`);
      } catch (error) {
        toast.error('Error deleting agent: ' + error.message);
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
            <Col md={5}>
              <InputGroup>
                <InputGroup.Text><Search size={16} /></InputGroup.Text>
                <Form.Control 
                  placeholder="Search by agent name, mobile, or route..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={7} className="d-flex justify-content-end gap-2">
              <Button onClick={() => setShowAddAgentModal(true)} size="sm" style={{ backgroundColor: 'rgb(238,95,14)', border: 'none', color: 'white' }}>
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
                      <td>
                        <Button 
                          variant="link" 
                          className="p-0 text-decoration-none fw-semibold" 
                          onClick={() => navigate(`/agents/${encodeURIComponent(agent.name)}`)}
                          style={{ color: '#0d6efd', cursor: 'pointer' }}
                        >
                          {agent.name}
                        </Button>
                      </td>
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
      <Modal show={showAddAgentModal} onHide={() => setShowAddAgentModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Add New Agent</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAddAgent}>
          <Modal.Body style={{ maxHeight: '65vh', overflowY: 'auto' }}>
            <Form.Group className="mb-3">
              <Form.Label>Agent Name</Form.Label>
              <Form.Control 
                type="text"
                value={newAgent.name} 
                onChange={e => setNewAgent({ ...newAgent, name: e.target.value })} 
                placeholder="Enter agent name manually"
                required 
              />
              <Form.Text className="text-muted">
                Enter the agent's full name
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Address</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={2}
                value={newAgent.address} 
                onChange={e => setNewAgent({ ...newAgent, address: e.target.value })} 
                placeholder="Enter agent address"
                required 
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Mobile Number</Form.Label>
              <Form.Control 
                type="text"
                value={newAgent.mobile} 
                onChange={e => {
                  const value = e.target.value.replace(/\D/g, ''); // Only allow digits
                  if (value.length <= 10) {
                    setNewAgent({ ...newAgent, mobile: value });
                  }
                }}
                pattern="[6-9][0-9]{9}"
                maxLength="10"
                placeholder="Enter 10-digit mobile number"
                required 
              />
              <Form.Text className="text-muted">
                10-digit number starting with 6-9
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <InputGroup>
                <Form.Control 
                  type={showPassword ? "text" : "password"} 
                  value={newAgent.password} 
                  onChange={e => setNewAgent({ ...newAgent, password: e.target.value })} 
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
              <Form.Label>Assign Routes</Form.Label>
              {routes.length === 0 ? (
                <p className="text-muted">No routes available. Please create routes first using Route Management page.</p>
              ) : (
                <>
                  <InputGroup className="mb-2">
                    <InputGroup.Text className="bg-white">
                      <Search size={16} />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Search routes or villages..."
                      value={routeSearchTerm}
                      onChange={(e) => setRouteSearchTerm(e.target.value)}
                    />
                  </InputGroup>
                  <div className="border rounded p-3 bg-light" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                    {routes.filter(route => {
                      const searchLower = routeSearchTerm.toLowerCase();
                      return route.name.toLowerCase().includes(searchLower) ||
                             route.villages.some(v => v.toLowerCase().includes(searchLower));
                    }).map((route) => (
                      <Form.Check
                        key={route.name}
                        type="checkbox"
                        label={`${route.name} (${route.villages.length} villages: ${route.villages.join(', ') || 'No villages'})`}
                        checked={newAgent.route.includes(route.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewAgent({ ...newAgent, route: [...newAgent.route, route.name] });
                          } else {
                            setNewAgent({ ...newAgent, route: newAgent.route.filter(r => r !== route.name) });
                          }
                        }}
                        className="mb-2 p-2 bg-white rounded"
                      />
                    ))}
                    {routes.filter(route => {
                      const searchLower = routeSearchTerm.toLowerCase();
                      return route.name.toLowerCase().includes(searchLower) ||
                             route.villages.some(v => v.toLowerCase().includes(searchLower));
                    }).length === 0 && (
                      <p className="text-muted text-center mb-0">No routes match your search</p>
                    )}
                  </div>
                </>
              )}
              <Form.Text className="text-muted d-block mt-2">
                Select one or more routes to assign to this agent
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAddAgentModal(false)}>Cancel</Button>
            <Button type="submit" style={{ backgroundColor: 'rgb(238,95,14)', border: 'none', color: 'white' }}>Add Agent</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Edit Agent Modal */}
      <Modal show={showEditAgentModal} onHide={() => {
        setShowEditAgentModal(false);
        setSelectedAgent(null);
        setEditRouteSearchTerm('');
      }} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Agent</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUpdateAgent}>
          <Modal.Body style={{ maxHeight: '65vh', overflowY: 'auto' }}>
            <Form.Group className="mb-3">
              <Form.Label>Agent Name</Form.Label>
              <Form.Control 
                type="text"
                value={editAgent.name} 
                onChange={e => setEditAgent({ ...editAgent, name: e.target.value })} 
                placeholder="Enter agent name"
                required 
              />
              <Form.Text className="text-muted">
                You can edit the agent's name
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Address</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={2}
                value={editAgent.address || ""} 
                onChange={e => setEditAgent({ ...editAgent, address: e.target.value })} 
                placeholder="Enter agent address"
              />
              <Form.Text className="text-muted">
                Enter the agent's address
              </Form.Text>
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
              <Form.Label>Assign Routes</Form.Label>
              {routes.length === 0 ? (
                <p className="text-muted">No routes available. Please create routes first using Route Management page.</p>
              ) : (
                <>
                  <InputGroup className="mb-2">
                    <InputGroup.Text className="bg-white">
                      <Search size={16} />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Search routes or villages..."
                      value={editRouteSearchTerm}
                      onChange={(e) => setEditRouteSearchTerm(e.target.value)}
                    />
                  </InputGroup>
                  <div className="border rounded p-3 bg-light" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                    {routes.filter(route => {
                      const searchLower = editRouteSearchTerm.toLowerCase();
                      return route.name.toLowerCase().includes(searchLower) ||
                             route.villages.some(v => v.toLowerCase().includes(searchLower));
                    }).map((route) => (
                      <Form.Check
                        key={route.name}
                        type="checkbox"
                        label={`${route.name} (${route.villages.length} villages: ${route.villages.join(', ') || 'No villages'})`}
                        checked={Array.isArray(editAgent.route) && editAgent.route.includes(route.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const currentRoutes = Array.isArray(editAgent.route) ? editAgent.route : [];
                            setEditAgent({ ...editAgent, route: [...currentRoutes, route.name] });
                          } else {
                            const currentRoutes = Array.isArray(editAgent.route) ? editAgent.route : [];
                            setEditAgent({ ...editAgent, route: currentRoutes.filter(r => r !== route.name) });
                          }
                        }}
                        className="mb-2 p-2 bg-white rounded"
                      />
                    ))}
                    {routes.filter(route => {
                      const searchLower = editRouteSearchTerm.toLowerCase();
                      return route.name.toLowerCase().includes(searchLower) ||
                             route.villages.some(v => v.toLowerCase().includes(searchLower));
                    }).length === 0 && (
                      <p className="text-muted text-center mb-0">No routes match your search</p>
                    )}
                  </div>
                </>
              )}
              <Form.Text className="text-muted d-block mt-2">
                Select one or more routes to assign to this agent
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditAgentModal(false)}>Cancel</Button>
            <Button type="submit" style={{ backgroundColor: 'rgb(238,95,14)', border: 'none', color: 'white' }}>Update Agent</Button>
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
                <div>
                  {selectedAgentForRoutes.route.map((routeName, i) => {
                    const routeInfo = routes.find(r => r.name === routeName);
                    return (
                      <Card key={i} className="mb-2">
                        <Card.Body className="p-3">
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <Badge bg="info" className="py-2 px-3" style={{ fontSize: '14px' }}>
                              {routeName}
                            </Badge>
                            <Button 
                              variant="outline-danger" 
                              size="sm"
                              onClick={async () => {
                                if (window.confirm(`Remove ${routeName} from ${selectedAgentForRoutes.name}?`)) {
                                  const updatedRoutes = selectedAgentForRoutes.route.filter(r => r !== routeName);
                                  await update(ref(database), {
                                    [`agents/${selectedAgentForRoutes.name}/route`]: updatedRoutes
                                  });
                                  toast.success(`${routeName} removed from ${selectedAgentForRoutes.name}`);
                                  setShowViewRoutesModal(false);
                                }
                              }}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                          <div>
                            <strong className="text-muted" style={{ fontSize: '12px' }}>Villages:</strong>
                            <div className="d-flex flex-wrap gap-2 mt-2">
                              {routeInfo && routeInfo.villages.length > 0 ? (
                                routeInfo.villages.map((village, idx) => (
                                  <Badge key={idx} bg="secondary" className="py-1 px-2" style={{ fontSize: '12px' }}>
                                    {village}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-muted" style={{ fontSize: '12px' }}>No villages</span>
                              )}
                            </div>
                          </div>
                        </Card.Body>
                      </Card>
                    );
                  })}
                </div>
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

      {/* Manage Routes Modal */}
      <Modal show={showManageRoutesModal} onHide={() => {
        setShowManageRoutesModal(false);
        setTempRoutes([]);
        setNewRouteName('');
        setNewVillage('');
        setSelectedRouteForEdit(null);
      }} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Manage Routes & Villages</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Create New Route Section - Only show if no route is being created */}
          {tempRoutes.length === 0 && (
            <Card className="mb-3 border-0">
              <Card.Body>
                <Form.Group className="mb-2">
                  <Form.Label>Route Name</Form.Label>
                  <InputGroup>
                    <Form.Control 
                      placeholder="Enter route name (e.g., Sangli Route, Kolhapur Route)"
                      value={newRouteName}
                      onChange={(e) => setNewRouteName(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateRoute();
                        }
                      }}
                    />
                    <Button 
                      onClick={handleCreateRoute}
                      disabled={!newRouteName.trim()}
                      style={{ backgroundColor: 'rgb(238,95,14)', border: 'none', color: 'white' }}
                    >
                      Create
                    </Button>
                  </InputGroup>
                </Form.Group>
                <Form.Text className="text-muted">
                  Enter a route name and click Create to add villages
                </Form.Text>
              </Card.Body>
            </Card>
          )}

          {/* Temporary Routes Being Created */}
          {tempRoutes.map((route) => (
            <Card key={route.name} className="mb-3 border-success">
              <Card.Header className="bg-success text-white d-flex justify-content-between align-items-center">
                <strong>{route.name}</strong>
                <Button 
                  variant="light" 
                  size="sm"
                  onClick={() => setTempRoutes(tempRoutes.filter(r => r.name !== route.name))}
                >
                  <Trash2 size={14} />
                </Button>
              </Card.Header>
              <Card.Body>
                <div className="mb-3">
                  <strong>Villages:</strong>
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    {route.villages.length === 0 ? (
                      <span className="text-muted">No villages added yet</span>
                    ) : (
                      route.villages.map((village, idx) => (
                        <Badge 
                          key={idx} 
                          bg="success" 
                          className="d-flex align-items-center gap-2 py-2 px-3"
                          style={{ fontSize: '14px' }}
                        >
                          {village}
                          <span 
                            onClick={() => handleRemoveVillageFromTemp(route.name, village)}
                            style={{ cursor: 'pointer', fontSize: '18px', lineHeight: '1' }}
                            title="Remove village"
                          >
                            ×
                          </span>
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
                <InputGroup size="sm">
                  <Form.Control 
                    placeholder="Enter village name"
                    value={selectedRouteForEdit === route.name ? newVillage : ''}
                    onChange={(e) => {
                      setNewVillage(e.target.value);
                      setSelectedRouteForEdit(route.name);
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddVillageToTemp(route.name);
                      }
                    }}
                  />
                  <Button 
                    onClick={() => handleAddVillageToTemp(route.name)}
                    disabled={!newVillage.trim() || selectedRouteForEdit !== route.name}
                    style={{ backgroundColor: 'rgb(238,95,14)', border: 'none', color: 'white' }}
                  >
                    OK
                  </Button>
                </InputGroup>
              </Card.Body>
            </Card>
          ))}

          {/* Existing Saved Routes */}
          {routes.length > 0 && (
            <>
              <hr />
              <h6 className="mb-3">Existing Routes</h6>
              {routes.map((route) => (
                <Card 
                  key={route.name} 
                  className="mb-3"
                >
                  <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                    <strong>{route.name}</strong>
                    <div className="d-flex gap-2">
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        onClick={() => handleClickExistingRoute(route)}
                      >
                        <Edit size={14} />
                      </Button>
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => handleDeleteRoute(route.name)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </Card.Header>
                  <Card.Body>
                    <div className="d-flex flex-wrap gap-2">
                      {route.villages.length === 0 ? (
                        <span className="text-muted">No villages</span>
                      ) : (
                        route.villages.map((village, idx) => (
                          <Badge key={idx} bg="secondary" className="py-2 px-3">
                            {village}
                          </Badge>
                        ))
                      )}
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setShowManageRoutesModal(false);
            setTempRoutes([]);
            setNewRouteName('');
            setNewVillage('');
            setSelectedRouteForEdit(null);
          }}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveAllRoutes}
            disabled={tempRoutes.length === 0}
            style={{ backgroundColor: 'rgb(238,95,14)', border: 'none', color: 'white' }}
          >
            Save Route
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Confirmation Modal for Editing Existing Route */}
      <Modal show={showEditRouteConfirm} onHide={() => setShowEditRouteConfirm(false)} centered size="sm">
        <Modal.Header closeButton>
          <Modal.Title>Confirm Edit</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Do you really want to update this route?</p>
          <p className="mb-0"><strong>{routeToEdit?.name}</strong></p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditRouteConfirm(false)}>
            No
          </Button>
          <Button variant="primary" onClick={handleConfirmEditRoute}>
            Yes
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Existing Route Modal */}
      <Modal show={showEditRouteModal} onHide={() => {
        setShowEditRouteModal(false);
        setShowManageRoutesModal(true);
        setRouteToEdit(null);
        setEditingRouteName('');
        setEditingRouteVillages([]);
        setNewVillage('');
      }} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Route</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <Card className="mb-3 border-warning">
            <Card.Header className="bg-warning text-dark">
              <strong>Route Name</strong>
            </Card.Header>
            <Card.Body>
              <Form.Control 
                placeholder="Enter route name"
                value={editingRouteName}
                onChange={(e) => setEditingRouteName(e.target.value)}
              />
            </Card.Body>
          </Card>

          <Card className="border-warning">
            <Card.Header className="bg-warning text-dark">
              <strong>Villages</strong>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <div className="d-flex flex-wrap gap-2">
                  {editingRouteVillages.length === 0 ? (
                    <span className="text-muted">No villages added yet</span>
                  ) : (
                    editingRouteVillages.map((village, idx) => (
                      <Badge 
                        key={idx} 
                        bg="warning" 
                        text="dark"
                        className="d-flex align-items-center gap-2 py-2 px-3"
                        style={{ fontSize: '14px' }}
                      >
                        {village}
                        <span 
                          onClick={() => handleRemoveVillageFromEdit(village)}
                          style={{ cursor: 'pointer', fontSize: '18px', lineHeight: '1' }}
                          title="Remove village"
                        >
                          ×
                        </span>
                      </Badge>
                    ))
                  )}
                </div>
              </div>
              <InputGroup size="sm">
                <Form.Control 
                  placeholder="Enter village name"
                  value={newVillage}
                  onChange={(e) => setNewVillage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddVillageToEdit();
                    }
                  }}
                />
                <Button 
                  variant="warning"
                  onClick={handleAddVillageToEdit}
                  disabled={!newVillage.trim()}
                >
                  OK
                </Button>
              </InputGroup>
            </Card.Body>
          </Card>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setShowEditRouteModal(false);
            setShowManageRoutesModal(true);
            setRouteToEdit(null);
            setEditingRouteName('');
            setEditingRouteVillages([]);
            setNewVillage('');
          }}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSaveEditedRoute}
          >
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default AgentsPage;
