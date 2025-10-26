// Модель группы с invite-ссылками
const mongoose = require('mongoose');
const crypto = require('crypto');

const GroupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Пожалуйста, введите название группы'],
        trim: true
    },
    
    description: {
        type: String,
        default: ''
    },
    
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    students: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    
    color: {
        type: String,
        default: '#667eea'
    },
    
    // НОВОЕ: Invite-код для присоединения
    inviteCode: {
        type: String,
        unique: true,
        default: () => crypto.randomBytes(8).toString('hex')
    },
    
    // НОВОЕ: Ссылка активна?
    inviteEnabled: {
        type: Boolean,
        default: true
    },
    
    // НОВОЕ: Срок действия ссылки
    inviteExpiresAt: {
        type: Date,
        default: null // null = бессрочно
    },
    
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Метод для генерации новой invite-ссылки
GroupSchema.methods.regenerateInviteCode = function() {
    this.inviteCode = crypto.randomBytes(8).toString('hex');
    return this.save();
};

// Метод для получения полной invite-ссылки
GroupSchema.methods.getInviteUrl = function(baseUrl = 'http://localhost:3000') {
    return `${baseUrl}/join-group/${this.inviteCode}`;
};

module.exports = mongoose.model('Group', GroupSchema);