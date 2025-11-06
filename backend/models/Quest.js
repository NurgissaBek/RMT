// Модель Quest - система квестов
const mongoose = require('mongoose');

const QuestSchema = new mongoose.Schema({
    // Название квеста
    title: {
        type: String,
        required: true,
        trim: true
    },
    
    // Описание квеста
    description: {
        type: String,
        required: true
    },
    
    // Тип квеста
    type: {
        type: String,
        enum: ['chain', 'daily', 'weekly', 'special'],
        default: 'chain'
    },
    
    // Цепочка задач (для chain квестов)
    tasks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
    }],
    
    // Требования для выполнения
    requirements: {
        // Количество задач для решения
        tasksToSolve: {
            type: Number,
            default: 1
        },
        
        // Минимальная сложность задач
        minDifficulty: {
            type: Number,
            min: 1,
            max: 5,
            default: 1
        },
        
        // Конкретные уровни Блума
        bloomLevels: [{
            type: String,
            enum: ['remembering', 'understanding', 'applying', 'analyzing', 'evaluating', 'creating']
        }],
        
        // Временные ограничения
        timeLimit: {
            type: Number, // в часах
            default: null
        }
    },
    
    // Награды
    rewards: {
        points: {
            type: Number,
            default: 100
        },
        
        experience: {
            type: Number,
            default: 50
        },
        
        // Специальный значок за квест
        badge: {
            name: String,
            icon: String,
            rarity: {
                type: String,
                enum: ['common', 'rare', 'epic', 'legendary'],
                default: 'rare'
            }
        },
        
        // Power-up в награду
        powerUp: {
            type: {
                type: String,
                enum: ['double_points', 'time_freeze', 'hint_reveal', 'auto_submit']
            },
            duration: Number // в часах
        }
    },
    
    // Сложность квеста
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard', 'expert'],
        default: 'medium'
    },
    
    // Иконка квеста
    icon: {
        type: String,
        default: '🎯'
    },
    
    // Квест активен?
    isActive: {
        type: Boolean,
        default: true
    },
    
    // Квест доступен только для определенных групп
    availableFor: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group'
    }],
    
    // Создатель (учитель)
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Даты
    startDate: {
        type: Date,
        default: Date.now
    },
    
    endDate: {
        type: Date,
        default: null
    },
    
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Метод: проверка доступности квеста для студента
QuestSchema.methods.isAvailableFor = function(student) {
    // Если availableFor пустой - доступен всем
    if (this.availableFor.length === 0) return true;
    
    // Проверяем пересечение групп студента с availableFor
    return student.groups.some(groupId => 
        this.availableFor.includes(groupId)
    );
};

// Метод: проверка выполнения квеста студентом
QuestSchema.methods.checkCompletion = async function(student) {
    const Submission = mongoose.model('Submission');
    
    // Получаем одобренные решения студента для задач из квеста
    const completedTasks = await Submission.find({
        student: student._id,
        task: { $in: this.tasks },
        status: 'approved'
    }).distinct('task');
    
    const progress = completedTasks.length;
    const required = this.requirements.tasksToSolve || this.tasks.length;
    
    return {
        completed: progress >= required,
        progress,
        required
    };
};

module.exports = mongoose.model('Quest', QuestSchema);