// Socket.IO client configuration
const socket = io({
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  autoConnect: true,
  forceNew: true,
  path: '/socket.io/',
  query: {
    clientId: generateClientId()
  }
});

// Generate unique client ID
function generateClientId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Connection event handlers
socket.on('connect', () => {
  console.log('Connected to server with ID:', socket.id);
  if (typeof _oReconnectingText !== 'undefined') {
    _oReconnectingText.visible = false;
  }
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  if (typeof _oReconnectingText !== 'undefined') {
    _oReconnectingText.visible = true;
  }
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  if (typeof _oReconnectingText !== 'undefined') {
    _oReconnectingText.visible = true;
  }
  if (reason === 'io server disconnect') {
    // Server initiated disconnect, try to reconnect
    socket.connect();
  }
});

// Reconnection event handlers
socket.on('reconnect_attempt', (attemptNumber) => {
  console.log('Reconnection attempt:', attemptNumber);
  if (typeof _oReconnectingText !== 'undefined') {
    _oReconnectingText.text = `Попытка переподключения ${attemptNumber}/5...`;
  }
});

socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
  if (typeof _oReconnectingText !== 'undefined') {
    _oReconnectingText.visible = false;
  }
});

socket.on('reconnect_error', (error) => {
  console.error('Reconnection error:', error);
  if (typeof _oReconnectingText !== 'undefined') {
    _oReconnectingText.text = 'Ошибка переподключения. Пробуем снова...';
  }
});

socket.on('reconnect_failed', () => {
  console.error('Failed to reconnect');
  if (typeof _oReconnectingText !== 'undefined') {
    _oReconnectingText.text = 'Не удалось подключиться к серверу. Обновите страницу.';
  }
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