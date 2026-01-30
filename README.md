# Pigmi Management System

A professional customer management system for Pigmi (daily collection) business with agent and admin panels.

## Features

### Agent Portal
- 📱 Mobile number & password based login
- 👥 Add and manage customers
- 💰 Track deposits and withdrawals
- 🔍 Search customers by name, mobile, or account number
- 📊 View all customers added by any agent
- 💵 Real-time transaction tracking

### Admin Portal
- 🎯 View all agents and their data
- 📈 Complete system overview
- 👁️ Monitor all customer transactions

## Tech Stack

- **Frontend**: React 18
- **UI Framework**: Bootstrap 5, React-Bootstrap
- **Routing**: React Router v6
- **State Management**: React Context API
- **Backend**: Firebase Realtime Database
- **Authentication**: Firebase Auth (planned)

## Getting Started

### Installation

```bash
npm install
```

### Run Development Server

```bash
npm start
```

The application will open at [http://localhost:3000](http://localhost:3000)

## Firebase Configuration

The application is connected to Firebase Realtime Database. All data (agents, customers, transactions) is automatically synced with Firebase.

**Firebase Project**: pigmi-846f4
**Database URL**: https://pigmi-846f4-default-rtdb.firebaseio.com

## Default Credentials

### Agent Login
- Mobile: 9876543210
- Password: agent123

### Admin Login
- Username: admin
- Password: admin123

## Project Structure

```
src/
├── components/        # Reusable components
├── pages/            # Page components
├── context/          # Context providers
├── styles/           # CSS files
└── App.js            # Main application
```

## Build for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder.
