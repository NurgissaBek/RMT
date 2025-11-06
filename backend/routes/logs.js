// backend/routes/logs.js
const express = require('express');
const router = express.Router();
const Log = require('../models/Log');
const { parseAsync } = require('json2csv'); // для CSV
const ExcelJS = require('exceljs');
const { protect, authorize } = require('../middleware/auth'); // используем вашу аутентификацию

// GET /api/logs?level=info&user=...&limit=100
router.get('/', protect, authorize('teacher'), async (req, res) => {
  try {
    const { level, user, route, limit = 200, skip = 0 } = req.query;
    const query = {};
    if (level) query.level = level;
    if (user) query.user = user;
    if (route) query.route = route;
    const logs = await Log.find(query).sort({ createdAt: -1 }).limit(parseInt(limit)).skip(parseInt(skip));
    res.json({ success: true, count: logs.length, logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/logs/export?format=csv|xlsx
router.get('/export', protect, authorize('teacher'), async (req, res) => {
  try {
    const { format = 'csv' } = req.query;
    const logs = await Log.find({}).sort({ createdAt: -1 }).lean();

    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Logs');
      sheet.columns = [
        { header: 'Time', key: 'createdAt', width: 25 },
        { header: 'Level', key: 'level', width: 10 },
        { header: 'Message', key: 'message', width: 60 },
        { header: 'User', key: 'user', width: 24 },
        { header: 'Route', key: 'route', width: 40 },
        { header: 'IP', key: 'ip', width: 20 },
        { header: 'Meta', key: 'meta', width: 80 }
      ];
      logs.forEach(l => sheet.addRow({
        createdAt: l.createdAt,
        level: l.level,
        message: l.message,
        user: l.user ? l.user.toString() : '',
        route: l.route,
        ip: l.ip,
        meta: JSON.stringify(l.meta || {})
      }));
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=logs.xlsx');
      await workbook.xlsx.write(res);
      res.end();
      return;
    } else {
      // CSV
      const fields = ['createdAt','level','message','user','route','ip','meta'];
      const opts = { fields, transforms: [(item) => ({ ...item, meta: JSON.stringify(item.meta) })] };
      const csv = await parseAsync(logs, opts);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=logs.csv');
      res.send(csv);
      return;
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
