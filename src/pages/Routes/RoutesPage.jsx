import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Form, Button, Badge, InputGroup } from "react-bootstrap";
import { ref, onValue, set, remove, update } from "firebase/database";
import { database } from "../../firebase";
import { Edit, Trash2, MapPin, Search } from "react-feather";
import { toast } from 'react-toastify';

function RoutesPage() {
  const [routes, setRoutes] = useState([]);
  const [newRouteName, setNewRouteName] = useState('');
  const [newVillage, setNewVillage] = useState('');
  const [tempRoutes, setTempRoutes] = useState([]);
  const [selectedRouteForEdit, setSelectedRouteForEdit] = useState(null);
  const [editingRouteName, setEditingRouteName] = useState('');
  const [editingRouteVillages, setEditingRouteVillages] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const routesRef = ref(database, "routes");
    onValue(routesRef, (snapshot) => {
      const routeData = snapshot.val() || {};
      const routeList = [];
      Object.entries(routeData).forEach(([routeName, villagesData]) => {
        const villages = Array.isArray(villagesData) 
          ? villagesData 
          : Object.values(villagesData || {});
        routeList.push({
          name: routeName,
          villages: villages
        });
      });
      setRoutes(routeList);
    });
  }, []);

  const handleCreateRoute = () => {
    if (!newRouteName.trim()) {
      toast.error('Please enter a route name');
      return;
    }

    if (routes.some(r => r.name === newRouteName.trim())) {
      toast.error('Route name already exists');
      return;
    }
    
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

    const routeWithNoVillages = tempRoutes.find(r => r.villages.length === 0);
    if (routeWithNoVillages) {
      toast.error(`Please add at least one village to ${routeWithNoVillages.name}`);
      return;
    }

    try {
      for (const route of tempRoutes) {
        await set(ref(database, `routes/${route.name}`), route.villages);
      }
      toast.success('Route(s) saved successfully!');
      setTempRoutes([]);
      setNewRouteName('');
      setNewVillage('');
      setSelectedRouteForEdit(null);
    } catch (error) {
      console.error('Error saving routes:', error);
      toast.error('Failed to save routes');
    }
  };

  const handleDeleteRoute = async (routeName) => {
    if (window.confirm(`Are you sure you want to delete route: ${routeName}?`)) {
      try {
        await remove(ref(database, `routes/${routeName}`));
        toast.success(`Route "${routeName}" deleted successfully!`);
      } catch (error) {
        console.error('Error deleting route:', error);
        toast.error('Failed to delete route');
      }
    }
  };

  const handleClickExistingRoute = (route) => {
    setEditingRouteName(route.name);
    setEditingRouteVillages([...route.villages]);
    setEditMode(true);
    setNewVillage('');
  };

  const handleAddVillageToEdit = () => {
    if (!newVillage.trim()) {
      toast.error('Please enter a village name');
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
    if (editingRouteVillages.length === 0) {
      toast.error('Please add at least one village');
      return;
    }

    try {
      await update(ref(database), {
        [`routes/${editingRouteName}`]: editingRouteVillages
      });
      toast.success(`Route "${editingRouteName}" updated successfully!`);
      setEditMode(false);
      setEditingRouteName('');
      setEditingRouteVillages([]);
      setNewVillage('');
    } catch (error) {
      console.error('Error updating route:', error);
      toast.error('Failed to update route');
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditingRouteName('');
    setEditingRouteVillages([]);
    setNewVillage('');
  };

  // Filter routes based on search term
  const filteredRoutes = routes.filter(route => {
    const searchLower = searchTerm.toLowerCase();
    const routeNameMatches = route.name.toLowerCase().includes(searchLower);
    const villageMatches = route.villages.some(village => 
      village.toLowerCase().includes(searchLower)
    );
    return routeNameMatches || villageMatches;
  });

  return (
    <Container fluid className="py-4">
      <div className="page-header mb-4">
        <h3 className="fw-bold">
          <MapPin size={28} className="me-2" style={{ marginTop: '-4px' }} />
          Route Management
        </h3>
        <p className="text-muted mb-0">Manage routes and their assigned villages</p>
      </div>

      <Row>
        <Col lg={6}>
          {/* Create New Route Section */}
          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-light">
              <h5 className="mb-0">Create New Route</h5>
            </Card.Header>
            <Card.Body>
              {tempRoutes.length === 0 ? (
                <>
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
                </>
              ) : (
                <div>
                  {tempRoutes.map((route) => (
                    <div key={route.name}>
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="mb-0">{route.name}</h6>
                        <Button 
                          variant="outline-danger" 
                          size="sm"
                          onClick={() => setTempRoutes([])}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                      
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
                      
                      <InputGroup size="sm" className="mb-3">
                        <Form.Control 
                          placeholder="Enter village name"
                          value={newVillage}
                          onChange={(e) => setNewVillage(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddVillageToTemp(route.name);
                            }
                          }}
                        />
                        <Button 
                          onClick={() => handleAddVillageToTemp(route.name)}
                          disabled={!newVillage.trim()}
                          style={{ backgroundColor: 'rgb(238,95,14)', border: 'none', color: 'white' }}
                        >
                          OK
                        </Button>
                      </InputGroup>

                      <div className="d-flex gap-2">
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => {
                            setTempRoutes([]);
                            setNewVillage('');
                            setSelectedRouteForEdit(null);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          size="sm"
                          onClick={handleSaveAllRoutes}
                          disabled={route.villages.length === 0}
                          style={{ backgroundColor: 'rgb(238,95,14)', border: 'none', color: 'white' }}
                        >
                          Save Route
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Edit Route Section */}
          {editMode && (
            <Card className="border-0 shadow-sm mb-4 border-warning">
              <Card.Header className="bg-warning bg-opacity-10">
                <h5 className="mb-0">Edit Route: {editingRouteName}</h5>
              </Card.Header>
              <Card.Body>
                <div className="mb-3">
                  <strong>Villages:</strong>
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    {editingRouteVillages.length === 0 ? (
                      <span className="text-muted">No villages</span>
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
                
                <InputGroup size="sm" className="mb-3">
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
                    onClick={handleAddVillageToEdit}
                    disabled={!newVillage.trim()}
                    style={{ backgroundColor: 'rgb(238,95,14)', border: 'none', color: 'white' }}
                  >
                    Add
                  </Button>
                </InputGroup>

                <div className="d-flex gap-2">
                  <Button variant="secondary" size="sm" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleSaveEditedRoute}
                    disabled={editingRouteVillages.length === 0}
                    style={{ backgroundColor: 'rgb(238,95,14)', border: 'none', color: 'white' }}
                  >
                    Save Changes
                  </Button>
                </div>
              </Card.Body>
            </Card>
          )}
        </Col>

        <Col lg={6}>
          {/* Existing Routes */}
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-light">
              <h5 className="mb-0">Existing Routes ({filteredRoutes.length})</h5>
            </Card.Header>
            <Card.Body>
              {/* Search Bar */}
              <InputGroup className="mb-3">
                <InputGroup.Text>
                  <Search size={16} />
                </InputGroup.Text>
                <Form.Control 
                  placeholder="Search by route name or village..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <Button 
                    variant="outline-secondary" 
                    onClick={() => setSearchTerm('')}
                  >
                    Clear
                  </Button>
                )}
              </InputGroup>

              <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                {filteredRoutes.length > 0 ? (
                  filteredRoutes.map((route) => (
                  <Card key={route.name} className="mb-3 border">
                    <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                      <strong>{route.name}</strong>
                      <div className="d-flex gap-2">
                        <Button 
                          variant="outline-warning" 
                          size="sm"
                          onClick={() => handleClickExistingRoute(route)}
                          disabled={editMode}
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
                ))
              ) : (
                <div className="text-center text-muted py-5">
                  <MapPin size={48} className="mb-3" />
                  {searchTerm ? (
                    <>
                      <p>No routes found matching "{searchTerm}"</p>
                      <Button 
                        size="sm" 
                        variant="outline-secondary"
                        onClick={() => setSearchTerm('')}
                      >
                        Clear Search
                      </Button>
                    </>
                  ) : (
                    <>
                      <p>No routes created yet</p>
                      <p className="small">Create your first route to get started</p>
                    </>
                  )}
                </div>
              )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default RoutesPage;
