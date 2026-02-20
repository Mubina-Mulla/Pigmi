// context/DataContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { database } from '../firebase';
import { ref, get, set, push, update, onValue } from 'firebase/database';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const [customers, setCustomers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load data from Firebase with real-time updates
  useEffect(() => {
    setLoading(true);
    
    // Listen for customers data
    const customersRef = ref(database, 'customers');
    const unsubscribeCustomers = onValue(customersRef, (snapshot) => {
      if (snapshot.exists()) {
        const customersData = snapshot.val();
        const customersArray = Object.keys(customersData).map(key => ({
          id: key,
          ...customersData[key]
        }));
        setCustomers(customersArray);
      } else {
        setCustomers([]);
      }
    }, (error) => {
      console.error('Error loading customers:', error);
    });

    // Listen for transactions data
    const transactionsRef = ref(database, 'transactions');
    const unsubscribeTransactions = onValue(transactionsRef, (snapshot) => {
      if (snapshot.exists()) {
        const transactionsData = snapshot.val();
        const transactionsArray = Object.keys(transactionsData).map(key => ({
          id: key,
          ...transactionsData[key]
        }));
        setTransactions(transactionsArray);
      } else {
        setTransactions([]);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error loading transactions:', error);
      setLoading(false);
    });

    // Cleanup function
    return () => {
      unsubscribeCustomers();
      unsubscribeTransactions();
    };
  }, []);

  const addCustomer = async (customerData, agentId, agentName, route) => {
    try {
      // Generate account number
      const accountNo = `PG${String(customers.length + 1).padStart(3, '0')}`;
      const newCustomerData = {
        ...customerData,
        accountNo,
        totalAmount: 0,
        withdrawnAmount: 0,
        agentId,
        agentName,
        route,
        createdAt: new Date().toISOString().split('T')[0],
      };
      
      const newCustomerRef = push(ref(database, 'customers'));
      await set(newCustomerRef, newCustomerData);
      
      return {
        id: newCustomerRef.key,
        ...newCustomerData,
      };
    } catch (error) {
      console.error('Error adding customer:', error);
      throw error;
    }
  };

  const addTransaction = async (customerId, type, amount, agentName) => {
    try {
      const customer = customers.find((c) => c.id === customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      const newTransactionData = {
        customerId,
        accountNo: customer.accountNo,
        customerName: customer.name,
        type,
        amount: parseInt(amount),
        date: new Date().toISOString().split('T')[0],
        agentName,
        timestamp: new Date().toISOString(),
      };

      // Add transaction to Firebase
      const newTransactionRef = push(ref(database, 'transactions'));
      await set(newTransactionRef, newTransactionData);

      // Update customer amounts in Firebase
      const customerRef = ref(database, `customers/${customerId}`);
      const updatedCustomer = { ...customer };
      
      if (type === 'deposit') {
        updatedCustomer.totalAmount = (customer.totalAmount || 0) + parseInt(amount);
      } else if (type === 'withdrawal' || type === 'withdraw') {
        updatedCustomer.withdrawnAmount = (customer.withdrawnAmount || 0) + parseInt(amount);
      }
      
      await update(customerRef, {
        totalAmount: updatedCustomer.totalAmount,
        withdrawnAmount: updatedCustomer.withdrawnAmount,
      });

      return true;
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  };

  const getCustomerTransactions = (customerId) => {
    return transactions.filter((t) => t.customerId === customerId);
  };

  const clearAllData = async () => {
    try {
      await set(ref(database, 'customers'), null);
      await set(ref(database, 'transactions'), null);
      alert('All customer and transaction data has been cleared from Firebase.');
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Error clearing data. Check console for details.');
    }
  };

  const resetDatabase = clearAllData;

  const refreshData = async () => {
    setLoading(true);
    try {
      const customersRef = ref(database, 'customers');
      const transactionsRef = ref(database, 'transactions');
      
      const [customersSnapshot, transactionsSnapshot] = await Promise.all([
        get(customersRef),
        get(transactionsRef)
      ]);
      
      if (customersSnapshot.exists()) {
        const customersData = customersSnapshot.val();
        const customersArray = Object.keys(customersData).map(key => ({
          id: key,
          ...customersData[key]
        }));
        setCustomers(customersArray);
      }
      
      if (transactionsSnapshot.exists()) {
        const transactionsData = transactionsSnapshot.val();
        const transactionsArray = Object.keys(transactionsData).map(key => ({
          id: key,
          ...transactionsData[key]
        }));
        setTransactions(transactionsArray);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    customers,
    transactions,
    loading,
    addCustomer,
    addTransaction,
    getCustomerTransactions,
    resetDatabase,
    clearAllData,
    refreshData,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};