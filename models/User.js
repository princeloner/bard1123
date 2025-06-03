const mongoose = require('mongoose');

// Схема пользователя
const userSchema = new mongoose.Schema({
  telegramId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  username: {
    type: String,
    default: ''
  },
  firstName: {
    type: String,
    default: ''
  },
  lastName: {
    type: String,
    default: ''
  },
  photoUrl: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: 'ru'
  },
  registeredAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  stats: {
    gamesPlayed: { type: Number, default: 0 },
    gamesWon: { type: Number, default: 0 },
    highScore: { type: Number, default: 0 }
  },
  settings: {
    soundEnabled: { type: Boolean, default: true },
    notificationsEnabled: { type: Boolean, default: true },
    selectedTable: { type: String, default: 'default' },
    selectedCue: { type: String, default: 'default' }
  }
}, { timestamps: true });

// Создаем виртуальное свойство для отображаемого имени
userSchema.virtual('displayName').get(function() {
  if (this.username) {
    return this.username;
  } else if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  } else if (this.firstName) {
    return this.firstName;
  } else {
    return `User_${this.telegramId}`;
  }
});

// Метод для обновления данных при входе
userSchema.methods.updateLoginInfo = function() {
  this.lastLogin = Date.now();
  return this.save();
};

// Метод для регистрации игры
userSchema.methods.recordGame = function(won, score) {
  this.stats.gamesPlayed += 1;
  
  if (won) {
    this.stats.gamesWon += 1;
  }
  
  if (score > this.stats.highScore) {
    this.stats.highScore = score;
  }
  
  return this.save();
};

// Статический метод для поиска или создания пользователя по Telegram ID
userSchema.statics.findOrCreateFromTelegram = async function(telegramData) {
  if (!telegramData || !telegramData.id) {
    throw new Error('Invalid Telegram data');
  }
  
  const telegramId = telegramData.id.toString();
  
  // Ищем пользователя по Telegram ID
  let user = await this.findOne({ telegramId });
  
  // Если пользователь не найден, создаем нового
  if (!user) {
    user = new this({
      telegramId,
      username: telegramData.username || '',
      firstName: telegramData.first_name || '',
      lastName: telegramData.last_name || '',
      photoUrl: telegramData.photo_url || '',
      language: telegramData.language_code || 'ru'
    });
    
    await user.save();
    console.log(`New user registered: ${telegramId} (${user.displayName})`);
  } else {
    // Обновляем информацию о пользователе, если она изменилась
    let updated = false;
    
    if (telegramData.username && telegramData.username !== user.username) {
      user.username = telegramData.username;
      updated = true;
    }
    
    if (telegramData.first_name && telegramData.first_name !== user.firstName) {
      user.firstName = telegramData.first_name;
      updated = true;
    }
    
    if (telegramData.last_name && telegramData.last_name !== user.lastName) {
      user.lastName = telegramData.last_name;
      updated = true;
    }
    
    if (telegramData.photo_url && telegramData.photo_url !== user.photoUrl) {
      user.photoUrl = telegramData.photo_url;
      updated = true;
    }
    
    // Обновляем дату последнего входа
    user.lastLogin = Date.now();
    
    if (updated) {
      await user.save();
      console.log(`User data updated: ${telegramId} (${user.displayName})`);
    }
  }
  
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;