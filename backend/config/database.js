// Подключение к базе данных MongoDB
const mongoose = require('mongoose');

const connectDatabase = async () => {
    try {
        // Подключаемся к MongoDB используя URI из .env файла
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log(`✅ MongoDB подключена: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ Ошибка подключения к MongoDB: ${error.message}`);
        process.exit(1); // Останавливаем сервер если не удалось подключиться
    }
};

module.exports = connectDatabase;