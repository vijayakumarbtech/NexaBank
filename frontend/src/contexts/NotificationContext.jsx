import React, { createContext, useContext, useState, useEffect } from 'react';
import { notificationAPI } from '../services/api';
import { onEvent } from '../services/socket';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        const { data } = await notificationAPI.getAll({ limit: 20 });
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      } catch {}
    };

    fetchNotifications();

    // Real-time notifications
    const cleanup = onEvent('notification:new', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);

      const icons = {
        FRAUD_ALERT: '🚨',
        LOGIN_ALERT: '🔐',
        PAYMENT_UPDATE: '💳',
        SYSTEM: 'ℹ️'
      };
      toast(`${icons[notification.type] || '🔔'} ${notification.title}`, {
        duration: 5000,
        style: {
          background: notification.priority === 'CRITICAL' ? '#7f1d1d' :
                      notification.priority === 'HIGH' ? '#92400e' : '#1e293b',
          color: '#f1f5f9',
          border: `1px solid ${notification.priority === 'CRITICAL' ? '#991b1b' : '#334155'}`
        }
      });
    });

    return cleanup;
  }, [user]);

  const markRead = async (id) => {
    try {
      await notificationAPI.markRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
