/**
 * Socket.io notification utilities
 * This file provides helper functions for sending notifications via socket.io
 */

/**
 * Send a notification to a specific user
 * @param {Object} io - The socket.io instance
 * @param {String} userId - The user ID to send the notification to
 * @param {Object} notification - The notification object
 */
const sendUserNotification = (io, userId, notification) => {
  if (!io || !userId || !notification) return;
  
  io.to(userId).emit('notification', {
    ...notification,
    timestamp: new Date()
  });
};

/**
 * Send a notification to all users with a specific role
 * @param {Object} io - The socket.io instance
 * @param {String} role - The role to send the notification to (e.g., 'admin', 'vendor')
 * @param {Object} notification - The notification object
 */
const sendRoleNotification = (io, role, notification) => {
  if (!io || !role || !notification) return;
  
  io.to(role).emit('notification', {
    ...notification,
    timestamp: new Date()
  });
};

/**
 * Send an order status update notification
 * @param {Object} io - The socket.io instance
 * @param {String} userId - The user ID to send the notification to
 * @param {Object} orderUpdate - The order update object containing orderId, status, customerPhone, amount
 */
const sendOrderStatusUpdate = (io, userId, orderUpdate) => {
  if (!io || !userId || !orderUpdate) return;
  
  // Send to specific vendor
  io.to(userId).emit('order_status', {
    ...orderUpdate,
    timestamp: new Date()
  });
  
  // Also notify admins about new orders
  if (orderUpdate.status === 'pending') {
    sendRoleNotification(io, 'admin', {
      type: 'new_order',
      title: 'New Order Received',
      message: `New order #${orderUpdate.orderId} for ${orderUpdate.customerPhone}`,
      amount: orderUpdate.amount,
      orderId: orderUpdate.orderId
    });
  }
};

/**
 * Send a withdrawal status update notification
 * @param {Object} io - The socket.io instance
 * @param {String} userId - The user ID to send the notification to
 * @param {Object} withdrawalUpdate - The withdrawal update object
 */
const sendWithdrawalStatusUpdate = (io, userId, withdrawalUpdate) => {
  if (!io || !userId || !withdrawalUpdate) return;
  
  io.to(userId).emit('withdrawal_status', {
    ...withdrawalUpdate,
    timestamp: new Date()
  });
};

/**
 * Send a payment notification to both vendor and admin
 * @param {Object} io - The socket.io instance
 * @param {String} vendorId - The vendor ID to send the notification to
 * @param {Object} paymentData - The payment data object
 */
const sendPaymentNotification = (io, vendorId, paymentData) => {
  if (!io || !vendorId || !paymentData) return;
  
  // Notify vendor
  sendUserNotification(io, vendorId, {
    type: 'payment',
    title: 'Payment Received',
    message: `Payment of ₦${paymentData.amount} received for order #${paymentData.orderId}`,
    amount: paymentData.amount,
    orderId: paymentData.orderId
  });
  
  // Notify admins
  sendRoleNotification(io, 'admin', {
    type: 'payment',
    title: 'New Payment',
    message: `Vendor ${paymentData.vendorName || vendorId} received payment of ₦${paymentData.amount}`,
    amount: paymentData.amount,
    orderId: paymentData.orderId,
    vendorId: vendorId
  });
};

module.exports = {
  sendUserNotification,
  sendRoleNotification,
  sendOrderStatusUpdate,
  sendWithdrawalStatusUpdate,
  sendPaymentNotification
};