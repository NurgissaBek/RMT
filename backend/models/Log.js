// backend/models/Log.js
const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
  level: { type: String, enum: ['info','warn','error','debug'], default: 'info' },
  message: { type: String, required: true },
  meta: { type: Object, default: {} }, // дополнительные данные
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  route: { type: String, default: null },
  ip: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Log', LogSchema);
