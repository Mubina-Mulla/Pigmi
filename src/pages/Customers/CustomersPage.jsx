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
  XCircle,
  Trash2
} from "react-feather";
import { toast } from 'react-toastify';

function CustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
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
    accountNo: "",
    name: "",
    mobile: "",
    address: "",
    village: "",
    aadharNumber: "",
    agentName: "",
    initialDeposit: ""
  });

  const [validationErrors, setValidationErrors] = useState({
    accountNo: "",
    mobile: "",
    aadhar: ""
  });

  const [editCustomer, setEditCustomer] = useState({
    name: "",
    mobile: "",
    address: "",
    aadharNumber: "",
    agentName: "",
    route: []
  });

  const [newPayment, setNewPayment] = useState({
    type: "deposit",
    amount: "",
    note: "",
    mode: "cash",
    method: "",
    receiverPhoneNumber: ""
  });

  // Fetch data
  useEffect(() => {
    const customersRef = ref(database, "customers");
    const agentsRef = ref(database, "agents");
    const transactionsRef = ref(database, "transactions");
    const routesRef = ref(database, "routes");

    // Fetch routes with villages
    onValue(routesRef, (snapshot) => {
      const routeData = snapshot.val() || {};
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
            village: customerInfo.village || "",
            address: customerInfo.address || "",
            aadharNumber: customerInfo.aadhaarNumber || customerInfo.aadharNumber || "",
            aadhaarNumber: customerInfo.aadhaarNumber || customerInfo.aadharNumber || "",
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

  // Sync global count with actual customer count
  const syncGlobalCount = async () => {
    try {
      const customersRef = ref(database, "customers");
      const snapshot = await get(customersRef);
      
      if (snapshot.exists()) {
        const customerData = snapshot.val();
        const actualCount = Object.keys(customerData).length;
        
        // Update global count to match actual customer count
        const globalCountRef = ref(database, 'globalCount');
        await set(globalCountRef, actualCount);
        
        console.log(`Global count synced: ${actualCount} customers`);
        return actualCount;
      } else {
        // No customers exist, set count to 0
        const globalCountRef = ref(database, 'globalCount');
        await set(globalCountRef, 0);
        console.log('Global count synced: 0 customers');
        return 0;
      }
    } catch (error) {
      console.error('Error syncing global count:', error);
      toast.error('Failed to sync customer count');
    }
  };

  // Sync agent customer count with actual customer data
  const syncAgentCustomerCount = async () => {
    try {
      const customersRef = ref(database, "customers");
      const snapshot = await get(customersRef);
      
      // Count customers per agent
      const agentCounts = {};
      
      if (snapshot.exists()) {
        const customerData = snapshot.val();
        Object.values(customerData).forEach(customer => {
          if (customer && customer.agentName) {
            agentCounts[customer.agentName] = (agentCounts[customer.agentName] || 0) + 1;
          }
        });
      }
      
      // Update agentCustomerCount in Firebase
      const agentCustomerCountRef = ref(database, 'agentCustomerCount');
      
      if (Object.keys(agentCounts).length > 0) {
        await set(agentCustomerCountRef, agentCounts);
        console.log('Agent customer counts synced:', agentCounts);
      } else {
        // No customers with agents, clear the node
        await remove(agentCustomerCountRef);
        console.log('Agent customer counts cleared (no customers)');
      }
      
      return agentCounts;
    } catch (error) {
      console.error('Error syncing agent customer count:', error);
      toast.error('Failed to sync agent customer count');
    }
  };

  // Call sync on component mount
  useEffect(() => {
    syncGlobalCount();
    syncAgentCustomerCount();
  }, []);

  const filteredCustomers = customers.filter(c => {
    const routeString = Array.isArray(c.route) ? c.route.join(', ').toLowerCase() : (c.route || '').toLowerCase();
    const mobile = c.mobileNumber || c.mobile || '';
    const accountNo = c.accountNumber || c.accountNo || '';
    const matchesSearch = searchTerm === "" || 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mobile.includes(searchTerm) ||
      accountNo.includes(searchTerm) ||
      c.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      routeString.includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Validation functions
  const validateAccountNo = (accountNo) => {
    const accountNoRegex = /^\d{9}$/;
    if (!accountNo) return "Account number is required";
    if (!accountNoRegex.test(accountNo)) return "Account number must be exactly 9 digits";
    return "";
  };

  const validateMobile = (mobile) => {
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobile) return "Mobile number is required";
    if (!mobileRegex.test(mobile)) return "Enter valid 10-digit mobile number starting with 6-9";
    return "";
  };

  const validateAadhar = (aadhar) => {
    const aadharRegex = /^[2-9]{1}[0-9]{11}$/;
    if (!aadhar) return "Aadhar number is required";
    if (!aadharRegex.test(aadhar)) return "Enter valid 12-digit Aadhar number";
    return "";
  };

  const handleAccountNoChange = (value) => {
    setNewCustomer({...newCustomer, accountNo: value});
    setValidationErrors({...validationErrors, accountNo: validateAccountNo(value)});
  };

  const handleMobileChange = (value) => {
    setNewCustomer({...newCustomer, mobile: value});
    setValidationErrors({...validationErrors, mobile: validateMobile(value)});
  };

  const handleAadharChange = (value) => {
    setNewCustomer({...newCustomer, aadharNumber: value});
    setValidationErrors({...validationErrors, aadhar: validateAadhar(value)});
  };

  // Generate next account number with year prefix (e.g., 202500001)
  const generateNextAccountNumber = async () => {
    const currentYear = new Date().getFullYear();
    const yearPrefix = currentYear.toString();
    
    // Get all customers with current year prefix
    const customersWithYearPrefix = customers.filter(c => 
      c.accountNo && c.accountNo.toString().startsWith(yearPrefix)
    );
    
    // Find the highest number
    let maxNumber = 0;
    customersWithYearPrefix.forEach(c => {
      const accountNo = c.accountNo.toString();
      if (accountNo.length === 9) { // Format: YYYY + 5 digits
        const numberPart = parseInt(accountNo.substring(4));
        if (numberPart > maxNumber) {
          maxNumber = numberPart;
        }
      }
    });
    
    // Generate next number
    const nextNumber = (maxNumber + 1).toString().padStart(5, '0');
    return yearPrefix + nextNumber;
  };

  // Open add customer modal and auto-generate account number
  const handleOpenAddCustomerModal = async () => {
    const nextAccountNo = await generateNextAccountNumber();
    setNewCustomer({
      accountNo: nextAccountNo,
      name: "",
      mobile: "",
      address: "",
      village: "",
      aadharNumber: "",
      agentName: "",
      initialDeposit: ""
    });
    setValidationErrors({ accountNo: "", mobile: "", aadhar: "" });
    setShowAddCustomerModal(true);
  };

  // Auto-assign agent based on address (district/route name)
  const handleAddressChange = (address) => {
    setNewCustomer({...newCustomer, address: address});
    
    // Parse address and find matching agent based on any route/district name
    const addressLower = address.toLowerCase();
    
    const matchingAgent = agents.find(agent => {
      if (Array.isArray(agent.route)) {
        return agent.route.some(route => 
          addressLower.includes(route.toLowerCase().trim())
        );
      }
      return agent.route && addressLower.includes(agent.route.toLowerCase().trim());
    });
    
    if (matchingAgent) {
      setNewCustomer(prev => ({...prev, address: address, agentName: matchingAgent.name}));
    } else {
      setNewCustomer(prev => ({...prev, address: address}));
    }
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    
    // Validate before submission
    const accountNoError = validateAccountNo(newCustomer.accountNo);
    const mobileError = validateMobile(newCustomer.mobile);
    const aadharError = validateAadhar(newCustomer.aadharNumber);
    
    if (accountNoError || mobileError || aadharError) {
      setValidationErrors({ accountNo: accountNoError, mobile: mobileError, aadhar: aadharError });
      return;
    }
    
    // Validate initial deposit
    const initialDeposit = parseInt(newCustomer.initialDeposit);
    if (!newCustomer.initialDeposit || isNaN(initialDeposit) || initialDeposit < 200) {
      toast.error('Please enter a valid initial deposit amount. Minimum deposit is ₹200');
      return;
    }
    
    // Check if account number already exists
    const existingCustomer = customers.find(c => (c.accountNumber || c.accountNo) === newCustomer.accountNo);
    if (existingCustomer) {
      toast.error('Account number already exists. Please use a different account number.');
      setValidationErrors({...validationErrors, accountNo: 'Account number already exists'});
      return;
    }
    
    const accountNo = newCustomer.accountNo;
    
    // Find the specific route that contains the customer's village
    const customerRoute = routes.find(route => 
      route.villages.includes(newCustomer.village)
    )?.name || '';
    
    const customerData = {
      accountNumber: accountNo,
      name: newCustomer.name,
      mobileNumber: newCustomer.mobile,
      address: newCustomer.address,
      village: newCustomer.village,
      aadhaarNumber: newCustomer.aadharNumber,
      agentName: newCustomer.agentName,
      route: customerRoute,
      totalAmount: parseInt(newCustomer.initialDeposit) || 0,
      withdrawnAmount: 0,
      createdDate: Date.now(),
      lastUpdated: Date.now(),
      status: "Active",
      paymentMethod: "Cash"
    };

    if (parseInt(newCustomer.initialDeposit) > 0) {
      const transactionId = generateTransactionId();
      const transaction = {
        type: "deposit",
        amount: parseInt(newCustomer.initialDeposit),
        date: new Date().toISOString().split('T')[0],
        timestamp: Date.now(),
        mode: "cash",
        note: "Initial deposit",
        addedBy: "admin"
      };
      await set(ref(database, `transactions/${accountNo}/${transactionId}`), transaction);
    }

    // Save customer data
    await set(ref(database, `customers/${accountNo}`), customerData);
    
    // Sync global count and agent customer count after adding customer
    await syncGlobalCount();
    await syncAgentCustomerCount();
    
    // Close modal first
    setShowAddCustomerModal(false);
    setNewCustomer({ accountNo: "", name: "", mobile: "", address: "", village: "", aadharNumber: "", agentName: "", initialDeposit: "" });
    setValidationErrors({ accountNo: "", mobile: "", aadhar: "" });
    
    // Show success message immediately after modal closes
    setTimeout(() => {
      toast.success(`Customer ${newCustomer.name} added successfully!`);
    }, 100);
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
  // eslint-disable-next-line no-unused-vars
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
      amount: parseInt(newPayment.amount),
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
      mode: newPayment.mode,
      note: newPayment.note,
      addedBy: "admin"
    };
    
    // Add receiver number if mode is online
    if (newPayment.mode === "online" && newPayment.receiverPhoneNumber) {
      transaction.receiverPhoneNumber = newPayment.receiverPhoneNumber;
    }

    await set(ref(database, `transactions/${selectedCustomerForPayment.accountNo}/${transactionId}`), transaction);
    
    const updates = {};
    if (newPayment.type === "deposit") {
      updates[`customers/${selectedCustomerForPayment.accountNo}/totalAmount`] = (selectedCustomerForPayment.totalAmount || 0) + parseInt(newPayment.amount);
    } else {
      updates[`customers/${selectedCustomerForPayment.accountNo}/withdrawnAmount`] = (selectedCustomerForPayment.withdrawnAmount || 0) + parseInt(newPayment.amount);
    }
    updates[`customers/${selectedCustomerForPayment.accountNo}/lastUpdated`] = Date.now();
    
    await update(ref(database), updates);
    toast.success(`${newPayment.type === 'deposit' ? 'Deposit' : 'Withdrawal'} of ₹${newPayment.amount} added successfully!`);
    setShowAddPaymentModal(false);
    setNewPayment({ type: "deposit", amount: "", note: "", mode: "cash", method: "", receiverPhoneNumber: "" });
    setSelectedCustomerForPayment(null);
  };

  const handleEditCustomer = (customer) => {
    setSelectedCustomerForEdit(customer);
    setEditCustomer({
      name: customer.name,
      mobile: customer.mobileNumber || customer.mobile,
      address: customer.address || "",
      aadharNumber: customer.aadhaarNumber || customer.aadharNumber || "",
      agentName: customer.agentName,
      route: Array.isArray(customer.route) ? customer.route[0] || '' : (customer.route || '')
    });
    setShowEditCustomerModal(true);
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    
    // Validate mobile and aadhar if they are changed
    const mobileError = validateMobile(editCustomer.mobile);
    const aadharError = editCustomer.aadharNumber ? validateAadhar(editCustomer.aadharNumber) : "";
    
    if (mobileError || aadharError) {
      toast.error(`Please fix validation errors: ${mobileError || ''} ${aadharError || ''}`);
      return;
    }
    
    const accountNo = selectedCustomerForEdit.accountNumber || selectedCustomerForEdit.accountNo;
    const updates = {};
    updates[`customers/${accountNo}/name`] = editCustomer.name;
    updates[`customers/${accountNo}/mobileNumber`] = editCustomer.mobile;
    updates[`customers/${accountNo}/address`] = editCustomer.address;
    updates[`customers/${accountNo}/aadhaarNumber`] = editCustomer.aadharNumber;
    updates[`customers/${selectedCustomerForEdit.accountNo}/agentName`] = editCustomer.agentName;
    updates[`customers/${selectedCustomerForEdit.accountNo}/route`] = editCustomer.route;
    updates[`customers/${selectedCustomerForEdit.accountNo}/lastUpdated`] = Date.now();
    
    await update(ref(database), updates);
    
    // Sync agent customer count after updating customer (agent might have changed)
    await syncAgentCustomerCount();
    
    toast.success(`Customer ${editCustomer.name} updated successfully!`);
    setShowEditCustomerModal(false);
    setSelectedCustomerForEdit(null);
  };

  const handlePaymentClick = (customer) => {
    setSelectedCustomerForPayment(customer);
    setNewPayment({ type: "deposit", amount: "", note: "", mode: "cash", method: "", receiverPhoneNumber: "" });
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

  const handleDeleteCustomer = async (customer) => {
    const confirmMessage = `Are you sure you want to delete customer ${customer.name}?\n\nThis will move the customer to Recycle Bin for 5 days.`;
    
    if (window.confirm(confirmMessage)) {
      try {
        // Get all customer data including transactions
        const customerDataSnapshot = await get(ref(database, `customers/${customer.accountNo}`));
        const transactionsSnapshot = await get(ref(database, `transactions/${customer.accountNo}`));
        const transactionCountSnapshot = await get(ref(database, `customerTransactionCount/${customer.accountNo}`));
        
        // Prepare deleted customer object
        const deletedCustomer = {
          data: customerDataSnapshot.val(),
          transactions: transactionsSnapshot.exists() ? transactionsSnapshot.val() : null,
          transactionCount: transactionCountSnapshot.exists() ? transactionCountSnapshot.val() : null,
          deletedAt: Date.now(),
          deletedBy: 'admin'
        };
        
        // Move to recycle bin
        await set(ref(database, `deletedCustomers/${customer.accountNo}`), deletedCustomer);
        
        // Delete customer transactions
        await remove(ref(database, `transactions/${customer.accountNo}`));
        
        // Delete customer transaction count
        await remove(ref(database, `customerTransactionCount/${customer.accountNo}`));
        
        // Delete customer data
        await remove(ref(database, `customers/${customer.accountNo}`));
        
        // Sync global count and agent customer count after deleting customer
        await syncGlobalCount();
        await syncAgentCustomerCount();
        
        toast.success(`Customer ${customer.name} moved to Recycle Bin. It will be kept for 5 days.`);
      } catch (error) {
        toast.error('Error deleting customer: ' + error.message);
      }
    }
  };

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Account No,Name,Mobile Number,Address,Aadhar Number,Deposit Amount,Withdrawn Amount,Balance,Agent,Route,Status,Created Date\n";
    filteredCustomers.forEach(c => {
      const address = (c.address || '').replace(/,/g, ';'); // Replace commas in address to avoid CSV issues
      const accountNo = c.accountNumber || c.accountNo;
      const mobile = c.mobileNumber || c.mobile;
      const aadhar = c.aadhaarNumber || c.aadharNumber || '';
      csvContent += `${accountNo},${c.name},${mobile},${address},${aadhar},${c.totalAmount || 0},${c.withdrawnAmount || 0},${c.balance || 0},${c.agentName},${c.route},${c.status || 'Active'},${c.createdAt}\n`;
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
                  placeholder="Search by name, mobile, account no, agent, or route..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={6} className="d-flex justify-content-end gap-2">
              <Button onClick={handleOpenAddCustomerModal} size="sm" style={{ backgroundColor: 'rgb(238,95,14)', border: 'none', color: 'white' }}>
                <Plus size={14} className="me-1" />
                Add Customer
              </Button>
              <Button size="sm" onClick={exportToCSV} style={{ backgroundColor: 'rgb(238,95,14)', border: 'none', color: 'white' }}>
                <Download size={14} className="me-1" />
                Export CSV
              </Button>
            </Col>
          </Row>

          <div className="table-responsive">
            <Table hover>
              <thead className="bg-light">
                <tr>
                  <th>Ac No</th>
                  <th>Customer</th>
                  <th>Address</th>
                  <th>Aadhar No</th>
                  <th>Deposit Amt</th>
                  <th>Withdrawn Amt</th>
                  <th>Balance (with Interest)</th>
                  <th>Interest Status</th>
                  <th>Agent & Route</th>
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
                  <tr 
                    key={c.id} 
                    className="align-middle" 
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/customers/${c.accountNumber || c.accountNo}`)}
                  >
                    <td><Badge bg="outline-primary" text="dark">{c.accountNumber || c.accountNo || c.customerId}</Badge></td>
                    <td>
                      <div className="fw-semibold">{c.name}</div>
                      <small className="text-muted">{c.mobileNumber || c.mobile}</small>
                    </td>
                    <td>
                      <small className="text-muted">
                        {c.address || <span className="text-danger">Not provided</span>}
                      </small>
                    </td>
                    <td>
                      <small className="text-muted">
                        {(c.aadhaarNumber || c.aadharNumber) ? (
                          <span className="font-monospace">{c.aadhaarNumber || c.aadharNumber}</span>
                        ) : (
                          <span className="text-danger">Not provided</span>
                        )}
                      </small>
                    </td>
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
                    <td>
                      <div>{c.agentName}</div>
                      <small>
                        <Badge bg="outline-info" text="dark" style={{ fontSize: '0.7rem' }}>
                          {Array.isArray(c.route) ? c.route.join(', ') : (c.route || 'N/A')}
                        </Badge>
                      </small>
                    </td>
                    <td className="text-muted"><small>{c.createdAt || c.createdDateFormatted}</small></td>
                    <td>
                      <Badge bg="success">
                        Active
                      </Badge>
                    </td>
                    <td>
                      <div className="d-flex flex-column gap-1">
                        <div className="d-flex gap-1">
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
                          <Button variant="outline-primary" size="sm" onClick={() => handleCustomerClick(c)} title="View Details">
                            <Eye size={14} />
                          </Button>
                        </div>
                        <div className="d-flex gap-1">
                          <Button variant="outline-warning" size="sm" onClick={() => handleEditCustomer(c)} title="Edit Customer & Route">
                            <Edit size={14} />
                          </Button>
                          <Button variant="outline-danger" size="sm" onClick={() => handleDeleteCustomer(c)} title="Delete Customer">
                            <Trash2 size={14} />
                          </Button>
                        </div>
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
      <Modal show={showAddCustomerModal} onHide={() => setShowAddCustomerModal(false)} centered size="lg" dialogClassName="custom-modal-width">
        <Modal.Header closeButton>
          <Modal.Title>Add New Customer</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAddCustomer}>
          <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Account Number</Form.Label>
                  <Form.Control 
                    type="text"
                    value={newCustomer.accountNo} 
                    readOnly
                    style={{ backgroundColor: '#e9ecef', cursor: 'not-allowed' }}
                    required 
                  />
                  <Form.Text className="text-muted">
                    Auto-generated account number
                  </Form.Text>
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Customer Name</Form.Label>
                  <Form.Control 
                    value={newCustomer.name} 
                    onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} 
                    required 
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Mobile Number</Form.Label>
                  <Form.Control 
                    type="text"
                    value={newCustomer.mobile} 
                    onChange={e => handleMobileChange(e.target.value)}
                    maxLength="10"
                    pattern="[6-9][0-9]{9}"
                    isInvalid={!!validationErrors.mobile}
                    required 
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.mobile}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    10-digit number (6-9)
                  </Form.Text>
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Aadhar Number</Form.Label>
                  <Form.Control 
                    type="text"
                    value={newCustomer.aadharNumber} 
                    onChange={e => handleAadharChange(e.target.value)}
                    maxLength="12"
                    pattern="[2-9][0-9]{11}"
                    isInvalid={!!validationErrors.aadhar}
                    required 
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.aadhar}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    12-digit Aadhar number
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3">
              <Form.Label>Address</Form.Label>
              <Form.Control 
                as="textarea"
                rows={2}
                value={newCustomer.address} 
                onChange={e => {
                  const addressValue = e.target.value;
                  setNewCustomer({...newCustomer, address: addressValue});
                  
                  // Auto-suggest village from address
                  if (addressValue.length > 3) {
                    const addressLower = addressValue.toLowerCase();
                    const allVillages = routes.flatMap(route => route.villages);
                    
                    // Find village that matches part of the address
                    const matchedVillage = allVillages.find(village => {
                      const villageLower = village.toLowerCase();
                      return addressLower.includes(villageLower) || 
                             addressLower.includes(villageLower.replace(/\s+/g, ''));
                    });
                    
                    if (matchedVillage && matchedVillage !== newCustomer.village) {
                      setNewCustomer(prev => ({
                        ...prev, 
                        address: addressValue,
                        village: matchedVillage,
                        agentName: '' // Reset agent when village auto-changes
                      }));
                    }
                  }
                }} 
                placeholder="Enter complete address (village will be auto-detected)"
                required 
              />
              {newCustomer.village && (
                <Form.Text className="text-success">
                  ✓ Detected village: {newCustomer.village}
                </Form.Text>
              )}
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Village</Form.Label>
              <Form.Control
                list="villages-list"
                placeholder="Type or select village name (auto-detected from address)"
                value={newCustomer.village}
                onChange={(e) => {
                  const selectedVillage = e.target.value;
                  setNewCustomer({...newCustomer, village: selectedVillage, agentName: ''});
                }}
                required
              />
              <datalist id="villages-list">
                {routes.flatMap(route => 
                  route.villages.map(village => (
                    <option key={`${route.name}-${village}`} value={village}>
                      {village} ({route.name})
                    </option>
                  ))
                )}
              </datalist>
              <Form.Text className="text-muted">
                Auto-detected from address or type/select manually
              </Form.Text>
            </Form.Group>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Select Agent</Form.Label>
                  <Form.Control
                    list="agents-list"
                    placeholder="Type or select agent name"
                    value={newCustomer.agentName}
                    onChange={(e) => setNewCustomer({...newCustomer, agentName: e.target.value})}
                    required
                  />
                  <datalist id="agents-list">
                    {newCustomer.village ? (
                      agents.filter(agent => {
                        // Find routes that contain the selected village
                        const matchingRoutes = routes.filter(route => 
                          route.villages.includes(newCustomer.village)
                        );
                        // Check if agent has any of those routes assigned
                        return matchingRoutes.some(route => 
                          Array.isArray(agent.route) && agent.route.includes(route.name)
                        );
                      }).map(a => (
                        <option key={a.name} value={a.name}>
                          {a.name} - Routes: {a.route.join(', ')}
                        </option>
                      ))
                    ) : (
                      agents.map(a => (
                        <option key={a.name} value={a.name}>
                          {a.name} - Routes: {a.route.join(', ')}
                        </option>
                      ))
                    )}
                  </datalist>
                  <Form.Text className="text-muted">
                    {newCustomer.village 
                      ? `✓ Filtered agents for ${newCustomer.village} (${agents.filter(agent => {
                          const matchingRoutes = routes.filter(route => 
                            route.villages.includes(newCustomer.village)
                          );
                          return matchingRoutes.some(route => 
                            Array.isArray(agent.route) && agent.route.includes(route.name)
                          );
                        }).length} available)` 
                      : 'Village will be auto-detected from address or type manually'}
                  </Form.Text>
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Initial Deposit</Form.Label>
                  <Form.Control 
                    type="number" 
                    min="200"
                    value={newCustomer.initialDeposit} 
                    onChange={e => setNewCustomer({...newCustomer, initialDeposit: e.target.value})} 
                    required
                    placeholder="Enter initial deposit amount"
                  />
                  <Form.Text className="text-muted">
                    Minimum deposit: ₹200
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAddCustomerModal(false)}>Cancel</Button>
            <Button type="submit" style={{ backgroundColor: 'rgb(238,95,14)', border: 'none', color: 'white' }}>Add Customer</Button>
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
              <Form.Select value={newPayment.mode} onChange={e => setNewPayment({...newPayment, mode: e.target.value, receiverPhoneNumber: ""})}>
                <option value="cash">Cash</option>
                <option value="online">Online</option>
                <option value="check">Check</option>
              </Form.Select>
            </Form.Group>
            
            {newPayment.mode === "online" && (
              <Form.Group className="mb-3">
                <Form.Label>Receiver Phone Number</Form.Label>
                <Form.Control 
                  type="text"
                  placeholder="Enter receiver's phone number"
                  value={newPayment.receiverPhoneNumber} 
                  onChange={e => setNewPayment({...newPayment, receiverPhoneNumber: e.target.value})}
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
              <Form.Label>Note</Form.Label>
              <Form.Control as="textarea" value={newPayment.note} onChange={e => setNewPayment({...newPayment, note: e.target.value})} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAddPaymentModal(false)}>Cancel</Button>
            <Button type="submit" style={{ backgroundColor: 'rgb(238,95,14)', border: 'none', color: 'white' }}>Add Payment</Button>
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
              <Form.Control 
                type="text"
                value={editCustomer.mobile} 
                onChange={e => setEditCustomer({...editCustomer, mobile: e.target.value})} 
                maxLength="10"
                pattern="[6-9][0-9]{9}"
                required 
              />
              <Form.Text className="text-muted">
                Enter 10-digit mobile number starting with 6-9
              </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Address</Form.Label>
              <Form.Control 
                as="textarea"
                rows={2}
                value={editCustomer.address} 
                onChange={e => setEditCustomer({...editCustomer, address: e.target.value})} 
                placeholder="Enter complete address"
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Aadhar Number</Form.Label>
              <Form.Control 
                type="text"
                value={editCustomer.aadharNumber} 
                onChange={e => setEditCustomer({...editCustomer, aadharNumber: e.target.value})} 
                maxLength="12"
                pattern="[2-9][0-9]{11}"
              />
              <Form.Text className="text-muted">
                Enter 12-digit Aadhar number
              </Form.Text>
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
            <Button type="submit" style={{ backgroundColor: 'rgb(238,95,14)', border: 'none', color: 'white' }}>Update Customer</Button>
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
              <h5 className="mb-3">{selectedCustomerDetails.name}</h5>
              
              <Row className="mb-3">
                <Col md={6}>
                  <p className="mb-2"><strong>Account No:</strong> {selectedCustomerDetails.accountNo}</p>
                  <p className="mb-2"><strong>Mobile:</strong> {selectedCustomerDetails.mobile}</p>
                  <p className="mb-2"><strong>Aadhar Number:</strong> {selectedCustomerDetails.aadharNumber || 'Not provided'}</p>
                </Col>
                <Col md={6}>
                  <p className="mb-2"><strong>Agent:</strong> {selectedCustomerDetails.agentName}</p>
                  <p className="mb-2"><strong>Route:</strong> {Array.isArray(selectedCustomerDetails.route) ? selectedCustomerDetails.route.join(', ') : selectedCustomerDetails.route}</p>
                  <p className="mb-2"><strong>Status:</strong> <Badge bg="success">{selectedCustomerDetails.status || 'Active'}</Badge></p>
                </Col>
              </Row>
              
              <div className="mb-3">
                <p className="mb-2"><strong>Address:</strong></p>
                <p className="text-muted">{selectedCustomerDetails.address || 'Not provided'}</p>
              </div>
              
              <Row className="mb-3">
                <Col md={4}>
                  <p className="mb-2"><strong>Total Deposits:</strong></p>
                  <h6 className="text-success">₹{(selectedCustomerDetails.totalAmount || 0).toLocaleString()}</h6>
                </Col>
                <Col md={4}>
                  <p className="mb-2"><strong>Total Withdrawn:</strong></p>
                  <h6 className="text-danger">₹{(selectedCustomerDetails.withdrawnAmount || 0).toLocaleString()}</h6>
                </Col>
                <Col md={4}>
                  <p className="mb-2"><strong>Balance:</strong></p>
                  <h6 className="text-primary">₹{(selectedCustomerDetails.balance || 0).toLocaleString()}</h6>
                </Col>
              </Row>
              
              <div className="mb-3">
                <p className="mb-2"><strong>Created Date:</strong> {selectedCustomerDetails.createdAt || selectedCustomerDetails.createdDateFormatted}</p>
                <p className="mb-2"><strong>Payment Method:</strong> {selectedCustomerDetails.paymentMethod || 'Cash'}</p>
                {selectedCustomerDetails.upiId && (
                  <p className="mb-2"><strong>UPI ID:</strong> {selectedCustomerDetails.upiId}</p>
                )}
              </div>
              
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
