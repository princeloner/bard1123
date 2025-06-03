// Socket.IO client configuration
const socket = io({
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  autoConnect: true,
  forceNew: true
});

// Connection event handlers
socket.on('connect', () => {
  console.log('Connected to server with ID:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  if (reason === 'io server disconnect') {
    // Server initiated disconnect, try to reconnect
    socket.connect();
  }
});

// Reconnection event handlers
socket.on('reconnect_attempt', (attemptNumber) => {
  console.log('Reconnection attempt:', attemptNumber);
});

socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
});

socket.on('reconnect_error', (error) => {
  console.error('Reconnection error:', error);
});

socket.on('reconnect_failed', () => {
  console.error('Failed to reconnect');
});

// Game event handlers
socket.on('telegram-pong', (data) => {
  console.log('Received pong:', data);
});

socket.on('telegram-shot', (data) => {
  console.log('Received shot:', data);
});

socket.on('telegram-shot-start', (data) => {
  console.log('Received shot start:', data);
});

socket.on('telegram-shot-cancel', () => {
  console.log('Received shot cancel');
});

// Export socket instance
export default socket; 