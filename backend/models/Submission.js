// Модель отправки решения задачи студентом
const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema({
    // Студент, отправивший решение
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Задача, которую решает студент
    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        required: true
    },
    
    // Код решения
    code: {
        type: String,
        required: [true, 'Код решения обязателен']
    },
    
    // Язык программирования
    language: {
        type: String,
        required: true
    },
    
    // Статус проверки
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'needs_revision'],
        default: 'pending'
    },
    
    // Баллы, полученные за решение
    pointsAwarded: {
        type: Number,
        default: 0
    },
    
    // Обратная связь от учителя
    feedback: {
        type: String,
        default: ''
    },
    
    // Учитель, проверивший работу
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    // Дата проверки
    reviewedAt: {
        type: Date
    },
    
    // Количество попыток студента
    attemptNumber: {
        type: Number,
        default: 1
    },
    
    // Время выполнения (в секундах)
    timeSpent: {
        type: Number,
        default: 0
    },
    
    // Дата отправки
    submittedAt: {
        type: Date,
        default: Date.now
    }
});

// INDEX: Быстрый поиск по студенту и задаче
SubmissionSchema.index({ student: 1, task: 1 });

// INDEX: Быстрый поиск по статусу
SubmissionSchema.index({ status: 1 });

module.exports = mongoose.model('Submission', SubmissionSchema);