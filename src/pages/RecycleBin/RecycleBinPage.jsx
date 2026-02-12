import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Table,
  Card,
  Button,
  Badge,
  Tabs,
  Tab
} from "react-bootstrap";
import { ref, onValue, remove, set, update } from "firebase/database";
import { database } from "../../firebase";
import { FaUndo, FaTrash, FaUsers, FaUserTie } from "react-icons/fa";
import { toast } from 'react-toastify';

function RecycleBinPage() {
  const [deletedCustomers, setDeletedCustomers] = useState([]);
  const [deletedAgents, setDeletedAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const deletedCustomersRef = ref(database, "deletedCustomers");
    const deletedAgentsRef = ref(database, "deletedAgents");

    onValue(deletedCustomersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = [];
      Object.entries(data).forEach(([id, item]) => {
        const daysRemaining = 5 - Math.floor((Date.now() - item.deletedAt) / (1000 * 60 * 60 * 24));
        if (daysRemaining > 0) {
          list.push({ ...item, id, daysRemaining });
        } else {
          // Auto-delete after 5 days
          remove(ref(database, `deletedCustomers/${id}`));
        }
      });
      setDeletedCustomers(list.sort((a, b) => b.deletedAt - a.deletedAt));
    });

    onValue(deletedAgentsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = [];
      Object.entries(data).forEach(([id, item]) => {
        const daysRemaining = 5 - Math.floor((Date.now() - item.deletedAt) / (1000 * 60 * 60 * 24));
        if (daysRemaining > 0) {
          list.push({ ...item, id, daysRemaining });
        } else {
          // Auto-delete after 5 days
          remove(ref(database, `deletedAgents/${id}`));
        }
      });
      setDeletedAgents(list.sort((a, b) => b.deletedAt - a.deletedAt));
      setLoading(false);
    });
  }, []);

  const handleRestoreCustomer = async (customer) => {
    if (window.confirm(`Restore customer ${customer.data.name}?`)) {
      try {
        // Restore customer data
        await set(ref(database, `customers/${customer.data.accountNo}`), customer.data);
        
        // Restore transactions if any
        if (customer.transactions) {
          for (const [txId, txData] of Object.entries(customer.transactions)) {
            await set(ref(database, `transactions/${customer.data.accountNo}/${txId}`), txData);
          }
        }
        
        // Restore transaction count
        if (customer.transactionCount) {
          await set(ref(database, `customerTransactionCount/${customer.data.accountNo}`), customer.transactionCount);
        }
        
        // Increment global count
        const globalCountRef = ref(database, 'globalCount');
        const globalCountSnapshot = await (await import('firebase/database')).get(globalCountRef);
        if (globalCountSnapshot.exists()) {
          const currentCount = globalCountSnapshot.val() || 0;
          await set(globalCountRef, currentCount + 1);
        }
        
        // Remove from recycle bin
        await remove(ref(database, `deletedCustomers/${customer.id}`));
        
        toast.success(`Customer ${customer.data.name} restored successfully!`);
      } catch (error) {
        toast.error('Error restoring customer: ' + error.message);
      }
    }
  };

  const handleRestoreAgent = async (agent) => {
    if (window.confirm(`Restore agent ${agent.data.name}?`)) {
      try {
        // Restore agent data
        await set(ref(database, `agents/${agent.data.name}`), {
          mobile: agent.data.mobile,
          password: agent.data.password,
          route: agent.data.route
        });
        
        // Remove from recycle bin
        await remove(ref(database, `deletedAgents/${agent.id}`));
        
        toast.success(`Agent ${agent.data.name} restored successfully!`);
      } catch (error) {
        toast.error('Error restoring agent: ' + error.message);
      }
    }
  };

  const handlePermanentDeleteCustomer = async (customer) => {
    if (window.confirm(`Permanently delete customer ${customer.data.name}? This cannot be undone!`)) {
      try {
        await remove(ref(database, `deletedCustomers/${customer.id}`));
        toast.success('Customer permanently deleted!');
      } catch (error) {
        toast.error('Error deleting customer: ' + error.message);
      }
    }
  };

  const handlePermanentDeleteAgent = async (agent) => {
    if (window.confirm(`Permanently delete agent ${agent.data.name}? This cannot be undone!`)) {
      try {
        await remove(ref(database, `deletedAgents/${agent.id}`));
        toast.success('Agent permanently deleted!');
      } catch (error) {
        toast.error('Error deleting agent: ' + error.message);
      }
    }
  };

  if (loading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary"></div>
          <p className="mt-3 text-muted">Loading recycle bin...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <div className="page-header mb-4">
        <h3 className="fw-bold">
          <FaTrash size={28} className="me-2" />
          Recycle Bin
        </h3>
        <p className="text-muted mb-0">Deleted items are kept for 5 days before permanent removal</p>
      </div>

      <Tabs defaultActiveKey="customers" className="mb-3">
        <Tab eventKey="customers" title={
          <span><FaUsers className="me-2" />Customers ({deletedCustomers.length})</span>
        }>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              {deletedCustomers.length > 0 ? (
                <Table hover responsive>
                  <thead className="bg-light">
                    <tr>
                      <th>Account No</th>
                      <th>Name</th>
                      <th>Mobile</th>
                      <th>Agent</th>
                      <th>Deleted On</th>
                      <th>Days Remaining</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deletedCustomers.map((customer) => (
                      <tr key={customer.id}>
                        <td><Badge bg="outline-primary" text="dark">{customer.data.accountNo}</Badge></td>
                        <td>{customer.data.name}</td>
                        <td>{customer.data.mobile}</td>
                        <td>{customer.data.agentName || 'N/A'}</td>
                        <td><small className="text-muted">{new Date(customer.deletedAt).toLocaleString()}</small></td>
                        <td>
                          <Badge bg={customer.daysRemaining <= 1 ? 'danger' : customer.daysRemaining <= 2 ? 'warning' : 'info'}>
                            {customer.daysRemaining} {customer.daysRemaining === 1 ? 'day' : 'days'}
                          </Badge>
                        </td>
                        <td>
                          <Button 
                            variant="success" 
                            size="sm" 
                            className="me-2"
                            onClick={() => handleRestoreCustomer(customer)}
                            title="Restore"
                          >
                            <FaUndo />
                          </Button>
                          <Button 
                            variant="danger" 
                            size="sm"
                            onClick={() => handlePermanentDeleteCustomer(customer)}
                            title="Delete Permanently"
                          >
                            <FaTrash />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="text-center text-muted py-5">
                  <FaUsers size={48} className="mb-3" />
                  <p>No deleted customers</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="agents" title={
          <span><FaUserTie className="me-2" />Agents ({deletedAgents.length})</span>
        }>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              {deletedAgents.length > 0 ? (
                <Table hover responsive>
                  <thead className="bg-light">
                    <tr>
                      <th>Name</th>
                      <th>Mobile</th>
                      <th>Routes</th>
                      <th>Deleted On</th>
                      <th>Days Remaining</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deletedAgents.map((agent) => (
                      <tr key={agent.id}>
                        <td>{agent.data.name}</td>
                        <td>{agent.data.mobile}</td>
                        <td>
                          <small>
                            {Array.isArray(agent.data.route) ? agent.data.route.join(', ') : agent.data.route}
                          </small>
                        </td>
                        <td><small className="text-muted">{new Date(agent.deletedAt).toLocaleString()}</small></td>
                        <td>
                          <Badge bg={agent.daysRemaining <= 1 ? 'danger' : agent.daysRemaining <= 2 ? 'warning' : 'info'}>
                            {agent.daysRemaining} {agent.daysRemaining === 1 ? 'day' : 'days'}
                          </Badge>
                        </td>
                        <td>
                          <Button 
                            variant="success" 
                            size="sm" 
                            className="me-2"
                            onClick={() => handleRestoreAgent(agent)}
                            title="Restore"
                          >
                            <FaUndo />
                          </Button>
                          <Button 
                            variant="danger" 
                            size="sm"
                            onClick={() => handlePermanentDeleteAgent(agent)}
                            title="Delete Permanently"
                          >
                            <FaTrash />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="text-center text-muted py-5">
                  <FaUserTie size={48} className="mb-3" />
                  <p>No deleted agents</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </Container>
  );
}

export default RecycleBinPage;
