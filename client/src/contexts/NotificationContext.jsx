import { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      const newSocket = io('/', {
        auth: { token },
        path: '/api/socket.io'
      });

      newSocket.on('connect', () => {
        setConnected(true);
      });

      newSocket.on('disconnect', () => {
        setConnected(false);
      });

      newSocket.on('notification', (notification) => {
        setNotifications(prev => [notification, ...prev]);
      });

      newSocket.on('order_status', (update) => {
        setNotifications(prev => [{
          type: 'ORDER_UPDATE',
          message: `Order #${update.orderId} status changed to ${update.status}`,
          timestamp: new Date(),
          data: update
        }, ...prev]);
      });

      newSocket.on('withdrawal_status', (update) => {
        setNotifications(prev => [{
          type: 'WITHDRAWAL_UPDATE',
          message: `Withdrawal #${update.withdrawalId} ${update.status}`,
          timestamp: new Date(),
          data: update
        }, ...prev]);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, []);

  const clearNotification = (index) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const value = {
    notifications,
    connected,
    clearNotification,
    clearAllNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};