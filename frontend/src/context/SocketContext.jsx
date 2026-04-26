import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const newSocket = io(API_URL, {
      transports: ['websocket', 'polling'],
      auth: { token: localStorage.getItem('accessToken') }
    });

    newSocket.on('connect', () => {
      setConnected(true);
      newSocket.emit('join_user_room', user._id);
      if (user.role === 'manager' || user.role === 'admin') {
        newSocket.emit('join_manager_room');
      }
      if (user.role === 'admin') {
        newSocket.emit('join_admin_room');
      }
    });

    newSocket.on('disconnect', () => setConnected(false));

    newSocket.on('transaction_update', (data) => {
      const msg = data.status === 'SUCCESS' ? `Transaction ${data.transactionId} completed!` :
        data.status === 'BLOCKED' ? `Transaction ${data.transactionId} was blocked!` :
        `Transaction ${data.transactionId} status: ${data.status}`;
      
      if (data.status === 'SUCCESS') toast.success(msg);
      else if (data.status === 'BLOCKED') toast.error(msg);
      else toast(msg);
    });

    newSocket.on('fraud_alert', (data) => {
      toast.error(`FRAUD ALERT: ${data.message}`, { duration: 6000 });
    });

    newSocket.on('login_alert', (data) => {
      toast(`New login from ${data.ipAddress}`, { icon: '🔐' });
    });

    newSocket.on('new_approval_request', (data) => {
      toast(`New approval request: $${data.amount} (Risk: ${data.riskScore})`, { icon: '⚠️', duration: 8000 });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, [isAuthenticated, user?._id]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
