// Модель User с расширенными игровыми элементами
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Пожалуйста, введите имя'],
        trim: true
    },
    
    email: {
        type: String,
        required: [true, 'Пожалуйста, введите email'],
        unique: true,
        lowercase: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Пожалуйста, введите корректный email'
        ]
    },
    
    password: {
        type: String,
        required: [true, 'Пожалуйста, введите пароль'],
        minlength: [6, 'Пароль должен быть минимум 6 символов'],
        select: false
    },
    
    role: {
        type: String,
        enum: ['student', 'teacher'],
        default: 'student'
    },
    
    // === БАЗОВЫЕ ОЧКИ ===
    points: {
        type: Number,
        default: 0
    },
    
    // === УРОВЕНЬ И ОПЫТ ===
    level: {
        type: Number,
        default: 1
    },
    
    experience: {
        type: Number,
        default: 0
    },
    
    // === СТРИКИ (СЕРИИ) ===
    currentStreak: {
        type: Number,
        default: 0
    },
    
    longestStreak: {
        type: Number,
        default: 0
    },
    
    lastSubmissionDate: {
        type: Date,
        default: null
    },
    
    // === ЗНАЧКИ (BADGES) ===
    badges: [{
        name: String,
        description: String,
        icon: String,
        earnedAt: {
            type: Date,
            default: Date.now
        },
        rarity: {
            type: String,
            enum: ['common', 'rare', 'epic', 'legendary'],
            default: 'common'
        }
    }],
    
    // === КВЕСТЫ ===
    activeQuests: [{
        questId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Quest'
        },
        progress: {
            type: Number,
            default: 0
        },
        startedAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    completedQuests: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quest'
    }],
    
    // === POWER-UPS (БОНУСЫ) ===
    powerUps: [{
        name: String,
        type: {
            type: String,
            enum: ['double_points', 'time_freeze', 'hint_reveal', 'auto_submit'],
            required: true
        },
        expiresAt: Date,
        usedAt: Date
    }],
    
    // === СТАТИСТИКА ===
    stats: {
        totalSubmissions: {
            type: Number,
            default: 0
        },
        successfulSubmissions: {
            type: Number,
            default: 0
        },
        totalTimeSpent: {
            type: Number,
            default: 0 // в секундах
        },
        favoriteLanguage: {
            type: String,
            default: 'python'
        }
    },
    
    groups: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group'
    }],
    
    // === АВАТАР ===
    avatar: {
        type: String,
        default: 'default-avatar.png'
    },
    
    // === ТИТУЛ ===
    title: {
        type: String,
        default: 'Новичок'
    },
    
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Middleware: шифрование пароля
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        next();
    }
    
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Метод: создание JWT токена
UserSchema.methods.getSignedJwtToken = function() {
    return jwt.sign(
        { id: this._id, role: this.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
    );
};

// Метод: проверка пароля
UserSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Метод: добавление опыта и проверка повышения уровня
UserSchema.methods.addExperience = async function(xp) {
    this.experience += xp;
    
    // Формула уровня: level = floor(sqrt(experience / 100))
    const newLevel = Math.floor(Math.sqrt(this.experience / 100)) + 1;
    
    if (newLevel > this.level) {
        this.level = newLevel;
        // Награда за повышение уровня
        this.points += newLevel * 50;
        
        return {
            leveledUp: true,
            newLevel: this.level,
            bonusPoints: newLevel * 50
        };
    }
    
    return { leveledUp: false };
};

// Метод: обновление стрика
UserSchema.methods.updateStreak = async function() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (!this.lastSubmissionDate) {
        // Первая отправка
        this.currentStreak = 1;
        this.longestStreak = 1;
        this.lastSubmissionDate = new Date();
    } else {
        const lastDate = new Date(this.lastSubmissionDate);
        lastDate.setHours(0, 0, 0, 0);
        
        const daysDiff = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 0) {
            // Сегодня уже была отправка
            return { streakUpdated: false };
        } else if (daysDiff === 1) {
            // Продолжение стрика
            this.currentStreak += 1;
            this.lastSubmissionDate = new Date();
            
            if (this.currentStreak > this.longestStreak) {
                this.longestStreak = this.currentStreak;
            }
            
            return { 
                streakUpdated: true, 
                currentStreak: this.currentStreak,
                bonusPoints: this.currentStreak * 5 // Бонус за стрик
            };
        } else {
            // Стрик прерван
            this.currentStreak = 1;
            this.lastSubmissionDate = new Date();
            
            return { 
                streakUpdated: true, 
                streakBroken: true,
                currentStreak: 1
            };
        }
    }
    
    return { streakUpdated: true, currentStreak: this.currentStreak };
};

// Метод: получить титул по уровню
UserSchema.methods.getTitle = function() {
    if (this.level >= 50) return 'Легенда Кода';
    if (this.level >= 40) return 'Мастер Алгоритмов';
    if (this.level >= 30) return 'Архитектор';
    if (this.level >= 20) return 'Эксперт';
    if (this.level >= 10) return 'Профессионал';
    if (this.level >= 5) return 'Разработчик';
    return 'Новичок';
};

module.exports = mongoose.model('User', UserSchema);