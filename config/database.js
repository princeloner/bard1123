const mongoose = require('mongoose');

// Функция для подключения к базе данных
const connectDB = async () => {
  try {
    // Используем переменную окружения для URI базы данных 
    // или используем локальную базу данных по умолчанию
    const mongoURI = process.env.MONGO_URI || 'mongodb+srv://gadgeymr:Gadget256@cluster0.0trbfcl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    
    // Параметры подключения
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true
    };
    
    // Подключаемся к базе данных
    const conn = await mongoose.connect(mongoURI, options);
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Настраиваем обработчики событий
    mongoose.connection.on('error', err => {
      console.error(`MongoDB connection error: ${err}`);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected, trying to reconnect...');
    });
    
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to app termination');
      process.exit(0);
    });
    
    return conn;
  } catch (err) {
    console.error(`Error connecting to MongoDB: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB; 