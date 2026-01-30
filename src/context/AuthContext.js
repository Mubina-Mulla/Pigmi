// src/context/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { ref, get, set, remove, update } from "firebase/database";
import { auth, database } from "../firebase";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Initialize user from localStorage if available
    const storedUser = localStorage.getItem("adminUser");
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔐 Listen to Firebase Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          role: "admin",
        };
        setUser(userData);
        localStorage.setItem("adminUser", JSON.stringify(userData));
        setLoading(false);
      } else {
        // Check localStorage before clearing
        const storedUser = localStorage.getItem("adminUser");
        if (!storedUser) {
          setUser(null);
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 🔐 ADMIN LOGIN (Firebase Auth)
  const loginAdmin = async (email, password) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
    return true;
  };

  // 🚪 LOGOUT
  const logout = async () => {
    await signOut(auth);
    setUser(null);
    localStorage.removeItem("adminUser");
  };

  // 👥 LOAD AGENTS (Realtime DB)
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const agentsRef = ref(database, "agents");
        const snapshot = await get(agentsRef);

        if (snapshot.exists()) {
          const data = snapshot.val();
          const list = Object.keys(data).map((key, index) => ({
            name: key,
            ...data[key],
            displayId: `agent${index + 1}`,
          }));
          setAgents(list);
        }
      } catch (err) {
        console.error("Failed to load agents:", err);
      }
    };

    loadAgents();
  }, []);

  // 👤 AGENT LOGIN (Local DB logic – OK)
  const loginAgent = (mobile, password) => {
    const agent = agents.find(
      (a) => a.mobile === mobile && a.password === password
    );
    if (!agent) return false;

    const agentUser = {
      role: "agent",
      name: agent.name,
      route: agent.route,
      mobile: agent.mobile,
    };

    setUser(agentUser);
    localStorage.setItem("adminUser", JSON.stringify(agentUser));
    return true;
  };

  // ➕ ADD AGENT
  const addAgent = async (agentData) => {
    const { name, ...rest } = agentData;
    const agentRef = ref(database, `agents/${name}`);
    await set(agentRef, rest);

    setAgents((prev) => [
      ...prev,
      { name, ...rest, displayId: `agent${prev.length + 1}` },
    ]);
  };

  // ✏️ UPDATE AGENT
  const updateAgent = async (oldName, agentData) => {
    const { name, ...rest } = agentData;

    if (oldName !== name) {
      await remove(ref(database, `agents/${oldName}`));
      await set(ref(database, `agents/${name}`), rest);
    } else {
      await update(ref(database, `agents/${oldName}`), rest);
    }

    setAgents((prev) =>
      prev.map((a) => (a.name === oldName ? { ...a, name, ...rest } : a))
    );
  };

  // ❌ DELETE AGENT
  const deleteAgent = async (name) => {
    await remove(ref(database, `agents/${name}`));
    setAgents((prev) => prev.filter((a) => a.name !== name));
  };

  const value = {
    user,
    agents,
    loading,
    loginAdmin,
    loginAgent,
    addAgent,
    updateAgent,
    deleteAgent,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
