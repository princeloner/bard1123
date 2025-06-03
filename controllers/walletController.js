const express = require('express');
const router = express.Router();
const TonWeb = require('tonweb');
const crypto = require('crypto');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Инициализация TonWeb
const tonweb = new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC', {
  apiKey: process.env.TON_API_KEY // Ваш API ключ от TON Center
}));

// Кошелек сервиса (адрес смарт-контракта для получения платежей)
const SERVICE_WALLET_ADDRESS = process.env.TON_SERVICE_WALLET;

// Создание депозита
router.post('/deposit', async (req, res) => {
  try {
    const { address, amount } = req.body;
    
    if (!address || !amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Некорректные параметры' });
    }
    
    // Найти пользователя по адресу кошелька или создать нового
    let user = await User.findOne({ walletAddress: address });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }
    
    // Сумма в наноТОН (1 TON = 10^9 наноТОН)
    const amountNano = Math.floor(amount * 1000000000);
    
    // Создаем новую транзакцию
    const transaction = new Transaction({
      userId: user._id,
      type: 'deposit',
      amount,
      amountNano,
      status: 'pending',
      walletAddress: address,
      serviceAddress: SERVICE_WALLET_ADDRESS
    });
    
    await transaction.save();
    
    // Генерируем комментарий для транзакции
    const payloadComment = `Deposit:${transaction._id}`;
    const payload = TonWeb.utils.stringToBase64(payloadComment);
    
    // Возвращаем данные для транзакции
    return res.json({
      success: true,
      contractAddress: SERVICE_WALLET_ADDRESS,
      amountNano,
      payload,
      transactionId: transaction._id
    });
    
  } catch (error) {
    console.error('Deposit error:', error);
    return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
});

// Вывод средств
router.post('/withdraw', async (req, res) => {
  try {
    const { address, amount } = req.body;
    
    if (!address || !amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Некорректные параметры' });
    }
    
    // Найти пользователя по адресу кошелька
    const user = await User.findOne({ walletAddress: address });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }
    
    // Проверяем баланс пользователя
    if (user.balance < amount) {
      return res.status(400).json({ success: false, message: 'Недостаточно средств' });
    }
    
    // Сумма в наноТОН
    const amountNano = Math.floor(amount * 1000000000);
    
    // Создаем новую транзакцию
    const transaction = new Transaction({
      userId: user._id,
      type: 'withdraw',
      amount,
      amountNano,
      status: 'pending',
      walletAddress: address,
      serviceAddress: SERVICE_WALLET_ADDRESS
    });
    
    await transaction.save();
    
    // Обновляем баланс пользователя (временно блокируем средства)
    user.balance -= amount;
    user.blockedBalance = (user.blockedBalance || 0) + amount;
    await user.save();
    
    // Запускаем процесс вывода средств (асинхронно)
    processWithdrawal(transaction._id).catch(console.error);
    
    return res.json({
      success: true,
      message: 'Запрос на вывод средств создан',
      transactionId: transaction._id
    });
    
  } catch (error) {
    console.error('Withdraw error:', error);
    return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
});

// Получение статуса транзакции
router.get('/transaction/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Транзакция не найдена' });
    }
    
    return res.json({
      success: true,
      status: transaction.status,
      message: transaction.statusMessage,
      amount: transaction.amount,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt
    });
    
  } catch (error) {
    console.error('Get transaction error:', error);
    return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
});

// Асинхронная функция для обработки депозитов
async function processWithdrawal(transactionId) {
  try {
    const transaction = await Transaction.findById(transactionId);
    
    if (!transaction || transaction.status !== 'pending') {
      return;
    }
    
    const user = await User.findById(transaction.userId);
    
    if (!user) {
      transaction.status = 'failed';
      transaction.statusMessage = 'Пользователь не найден';
      await transaction.save();
      return;
    }
    
    // Здесь должна быть логика отправки TON с сервисного кошелька
    // Это требует доступа к приватному ключу сервисного кошелька
    // В продакшене рекомендуется использовать отдельный микросервис для операций с криптовалютой
    
    // Пример (с использованием мнемонической фразы):
    // const mnemonic = process.env.TON_WALLET_MNEMONIC.split(' ');
    // const keyPair = await TonWeb.utils.mnemonicToKeyPair(mnemonic);
    // const wallet = new tonweb.wallet.create({ publicKey: keyPair.publicKey });
    // const transfer = await wallet.transfer({
    //   secretKey: keyPair.secretKey,
    //   toAddress: transaction.walletAddress,
    //   amount: transaction.amountNano,
    //   seqno: await wallet.methods.seqno().call(),
    //   payload: TonWeb.utils.stringToBase64(`Withdraw:${transaction._id}`)
    // });
    
    // Помечаем транзакцию как успешную
    transaction.status = 'completed';
    transaction.statusMessage = 'Средства успешно выведены';
    await transaction.save();
    
    // Убираем блокировку средств
    user