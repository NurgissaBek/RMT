// Модель Task с тест-кейсами для автоматической проверки
const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Пожалуйста, введите название задачи'],
        trim: true
    },
    
    description: {
        type: String,
        required: [true, 'Пожалуйста, введите описание задачи']
    },
    
    bloomLevel: {
        type: String,
        enum: ['remembering', 'understanding', 'applying', 'analyzing', 'evaluating', 'creating'],
        required: true
    },
    
    difficulty: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    
    points: {
        type: Number,
        required: true,
        default: 10
    },
    
    programmingLanguage: {
        type: String,
        enum: ['python', 'javascript', 'java', 'cpp', 'other'],
        default: 'python'
    },
    
    examples: [{
        input: String,
        output: String,
        explanation: String
    }],
    
    hints: [{
        type: String
    }],
    
    // НОВОЕ: Тест-кейсы для автоматической проверки
    testCases: [{
        input: {
            type: String,
            required: true
        },
        expectedOutput: {
            type: String,
            required: true
        },
        points: {
            type: Number,
            default: 10 // Баллы за этот тест
        },
        isHidden: {
            type: Boolean,
            default: false // Скрытый тест (студент не видит)
        }
    }],
    
    // НОВОЕ: Автопроверка включена?
    autoCheckEnabled: {
        type: Boolean,
        default: false
    },
    
    // НОВОЕ: Таймаут выполнения кода (секунды)
    timeLimit: {
        type: Number,
        default: 5
    },
    
    // НОВОЕ: Лимит памяти (MB)
    memoryLimit: {
        type: Number,
        default: 128
    },
    
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    isActive: {
        type: Boolean,
        default: true
    },
    
    deadline: {
        type: Date,
        default: null
    },
    
    assignedGroups: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group'
    }],
    
    createdAt: {
        type: Date,
        default: Date.now
    },
    
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

TaskSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Task', TaskSchema);