function CTonWallet() {
    var _oTonConnector; // Коннектор к TON кошельку
    var _iBalance = 0; // Баланс пользователя
    var _sUserAddress = null; // Адрес кошелька пользователя
    var _bConnected = false; // Статус подключения
    var _oEventDispatcher; // Диспетчер событий
    
    // События
    const ON_WALLET_CONNECTED = "on_wallet_connected";
    const ON_WALLET_DISCONNECTED = "on_wallet_disconnected";
    const ON_BALANCE_UPDATED = "on_balance_updated";
    const ON_TRANSACTION_COMPLETED = "on_transaction_completed";
    
    this._init = function() {
      _oEventDispatcher = new createjs.EventDispatcher();
      
      // Инициализация TON Connect SDK
      const manifestUrl = window.location.origin + '/tonconnect-manifest.json';
      _oTonConnector = new window.TonConnect.TonConnect({ manifestUrl });
      
      // Проверка предыдущего подключения
      this._restoreConnection();
    };
    
    this._restoreConnection = function() {
      // Проверяем, был ли пользователь ранее подключен
      if (_oTonConnector.connected) {
        _bConnected = true;
        _sUserAddress = _oTonConnector.account.address;
        this._updateBalance();
        
        // Уведомляем о подключении
        _oEventDispatcher.dispatchEvent(ON_WALLET_CONNECTED);
      }
    };
    
    this.connect = async function() {
      try {
        // Список поддерживаемых кошельков
        const wallets = await _oTonConnector.getWallets();
        
        // Подключаемся, используя предпочтительно Telegram Wallet если доступен
        const telegramWallet = wallets.find(w => w.name.toLowerCase().includes('telegram'));
        const defaultWallet = telegramWallet || wallets[0];
        
        // Открываем модальное окно для подключения
        const connectedWallet = await _oTonConnector.connect(defaultWallet);
        
        if (connectedWallet) {
          _bConnected = true;
          _sUserAddress = connectedWallet.account.address;
          this._updateBalance();
          
          // Уведомляем о подключении
          _oEventDispatcher.dispatchEvent(ON_WALLET_CONNECTED);
          
          return true;
        }
        
        return false;
      } catch (error) {
        console.error("Ошибка подключения кошелька:", error);
        return false;
      }
    };
    
    this.disconnect = async function() {
      try {
        await _oTonConnector.disconnect();
        _bConnected = false;
        _sUserAddress = null;
        _iBalance = 0;
        
        // Уведомляем об отключении
        _oEventDispatcher.dispatchEvent(ON_WALLET_DISCONNECTED);
        
        return true;
      } catch (error) {
        console.error("Ошибка отключения кошелька:", error);
        return false;
      }
    };
    
    this._updateBalance = async function() {
      if (!_bConnected || !_sUserAddress) return;
      
      try {
        // Инициализация TonWeb для запроса баланса
        const tonweb = new TonWeb();
        const balance = await tonweb.getBalance(_sUserAddress);
        
        // Конвертируем из наноТОН в ТОН
        _iBalance = balance / 1000000000;
        
        // Уведомляем об обновлении баланса
        _oEventDispatcher.dispatchEvent(ON_BALANCE_UPDATED);
        
        return _iBalance;
      } catch (error) {
        console.error("Ошибка получения баланса:", error);
        return 0;
      }
    };
    
    this.deposit = async function(amount) {
      if (!_bConnected) {
        alertShow("Пожалуйста, подключите кошелек сначала");
        return false;
      }
      
      try {
        // Создаем данные для транзакции пополнения
        const serverEndpoint = '/api/deposit'; // Эндпоинт на сервере для обработки пополнения
        
        // Получаем данные для транзакции от сервера
        const response = await fetch(serverEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            address: _sUserAddress,
            amount: amount
          })
        });
        
        const transactionData = await response.json();
        
        // Отправляем транзакцию через кошелек
        const result = await _oTonConnector.sendTransaction({
          validUntil: Date.now() + 5 * 60 * 1000, // 5 минут на подтверждение
          messages: [
            {
              address: transactionData.contractAddress,
              amount: transactionData.amountNano.toString(),
              payload: transactionData.payload
            }
          ]
        });
        
        if (result) {
          alertShow("Транзакция отправлена! Ожидайте зачисления средств.");
          
          // Опрашиваем сервер для подтверждения транзакции
          this._pollTransactionStatus(transactionData.transactionId);
          return true;
        }
        
        return false;
      } catch (error) {
        console.error("Ошибка пополнения:", error);
        alertShow("Ошибка пополнения: " + error.message);
        return false;
      }
    };
    
    this.withdraw = async function(amount) {
      if (!_bConnected) {
        alertShow("Пожалуйста, подключите кошелек сначала");
        return false;
      }
      
      try {
        // Отправляем запрос на вывод средств на сервер
        const serverEndpoint = '/api/withdraw';
        
        const response = await fetch(serverEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            address: _sUserAddress,
            amount: amount
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          // Опрашиваем сервер для подтверждения транзакции
          this._pollTransactionStatus(result.transactionId);
          alertShow("Запрос на вывод средств отправлен!");
          return true;
        } else {
          alertShow(result.message || "Ошибка вывода средств");
          return false;
        }
      } catch (error) {
        console.error("Ошибка вывода средств:", error);
        alertShow("Ошибка вывода средств: " + error.message);
        return false;
      }
    };
    
    this._pollTransactionStatus = function(transactionId) {
      const checkInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/transaction/${transactionId}`);
          const result = await response.json();
          
          if (result.status === 'completed') {
            // Транзакция успешно завершена
            clearInterval(checkInterval);
            this._updateBalance();
            _oEventDispatcher.dispatchEvent(ON_TRANSACTION_COMPLETED, { transactionId });
            alertShow("Транзакция успешно завершена!");
          } else if (result.status === 'failed') {
            // Транзакция не удалась
            clearInterval(checkInterval);
            alertShow("Транзакция не удалась: " + result.message);
          }
          // Для 'pending' продолжаем опрашивать
        } catch (error) {
          console.error("Ошибка проверки статуса транзакции:", error);
        }
      }, 5000); // Проверяем каждые 5 секунд
      
      // Прекращаем опрос через 5 минут (если транзакция не завершилась)
      setTimeout(() => {
        clearInterval(checkInterval);
      }, 5 * 60 * 1000);
    };
    
    this.getBalance = function() {
      return _iBalance;
    };
    
    this.getFormattedBalance = function() {
      return _iBalance.toFixed(2) + " TON";
    };
    
    this.isConnected = function() {
      return _bConnected;
    };
    
    this.getAddress = function() {
      return _sUserAddress;
    };
    
    this.addEventListener = function(evt, callback, scope) {
      _oEventDispatcher.addEventListener(evt, callback, scope);
    };
    
    this._init();
  }
  
  // Константы для событий
  const ON_TON_WALLET_CONNECTED = "on_ton_wallet_connected";
  const ON_TON_WALLET_DISCONNECTED = "on_ton_wallet_disconnected";
  const ON_TON_BALANCE_UPDATED = "on_ton_balance_updated";
  const ON_TON_TRANSACTION_COMPLETED = "on_ton_transaction_completed";
  
  // Глобальный объект для доступа к TON кошельку
  var s_oTonWallet = null;