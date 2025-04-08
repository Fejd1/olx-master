// routes/notifications.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Middleware autoryzacji dla wszystkich tras
router.use(authMiddleware);

// Pobieranie powiadomień użytkownika
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const userId = req.user.id;
    const { status, limit = 20, offset = 0 } = req.query;
    
    let query = `
      SELECT n.*, l.title as listing_title, l.price as listing_price, l.url as listing_url, l.image_url as listing_image
      FROM notifications n
      JOIN listings l ON n.listing_id = l.id
      WHERE n.user_id = ?
    `;
    
    const params = [userId];
    
    if (status) {
      query += ' AND n.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [notifications] = await db.query(query, params);
    
    // Pobierz całkowitą liczbę powiadomień
    let countQuery = 'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?';
    const countParams = [userId];
    
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }
    
    const [countResult] = await db.query(countQuery, countParams);
    const total = countResult[0].total;
    
    res.json({
      success: true,
      notifications,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + notifications.length < total
      }
    });
  } catch (error) {
    console.error('Błąd podczas pobierania powiadomień:', error);
    res.status(500).json({ success: false, message: 'Wystąpił błąd podczas pobierania powiadomień' });
  }
});

// Aktualizacja statusu powiadomienia
// routes/notifications.js (kontynuacja)
router.put('/:id', async (req, res) => {
    try {
      const notificationId = req.params.id;
      const { status } = req.body;
      
      if (!status || !['pending', 'sent', 'read'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Nieprawidłowy status powiadomienia' });
      }
      
      const db = req.app.locals.db;
      const userId = req.user.id;
      
      // Sprawdź, czy powiadomienie istnieje i należy do użytkownika
      const [notifications] = await db.query(
        'SELECT id FROM notifications WHERE id = ? AND user_id = ?',
        [notificationId, userId]
      );
      
      if (notifications.length === 0) {
        return res.status(404).json({ success: false, message: 'Powiadomienie nie znalezione' });
      }
      
      // Aktualizuj status powiadomienia
      await db.query(
        'UPDATE notifications SET status = ? WHERE id = ?',
        [status, notificationId]
      );
      
      res.json({
        success: true,
        message: 'Status powiadomienia zaktualizowany pomyślnie'
      });
    } catch (error) {
      console.error('Błąd podczas aktualizacji statusu powiadomienia:', error);
      res.status(500).json({ success: false, message: 'Wystąpił błąd podczas aktualizacji statusu powiadomienia' });
    }
  });
  
  // Oznaczanie wszystkich powiadomień jako przeczytane
  router.put('/mark-all-read', async (req, res) => {
    try {
      const db = req.app.locals.db;
      const userId = req.user.id;
      
      // Aktualizuj status wszystkich powiadomień użytkownika
      await db.query(
        'UPDATE notifications SET status = "read" WHERE user_id = ? AND status != "read"',
        [userId]
      );
      
      res.json({
        success: true,
        message: 'Wszystkie powiadomienia oznaczone jako przeczytane'
      });
    } catch (error) {
      console.error('Błąd podczas oznaczania powiadomień jako przeczytane:', error);
      res.status(500).json({ success: false, message: 'Wystąpił błąd podczas oznaczania powiadomień jako przeczytane' });
    }
  });
  
  // Usuwanie powiadomienia
  router.delete('/:id', async (req, res) => {
    try {
      const notificationId = req.params.id;
      const db = req.app.locals.db;
      const userId = req.user.id;
      
      // Sprawdź, czy powiadomienie istnieje i należy do użytkownika
      const [notifications] = await db.query(
        'SELECT id FROM notifications WHERE id = ? AND user_id = ?',
        [notificationId, userId]
      );
      
      if (notifications.length === 0) {
        return res.status(404).json({ success: false, message: 'Powiadomienie nie znalezione' });
      }
      
      // Usuń powiadomienie
      await db.query('DELETE FROM notifications WHERE id = ?', [notificationId]);
      
      res.json({
        success: true,
        message: 'Powiadomienie usunięte pomyślnie'
      });
    } catch (error) {
      console.error('Błąd podczas usuwania powiadomienia:', error);
      res.status(500).json({ success: false, message: 'Wystąpił błąd podczas usuwania powiadomienia' });
    }
  });
  
  // Konfiguracja ustawień powiadomień
  router.post('/settings', async (req, res) => {
    try {
      const { email_notifications, push_notifications, sms_notifications, min_profit_threshold } = req.body;
      const db = req.app.locals.db;
      const userId = req.user.id;
      
      // Sprawdź, czy ustawienia już istnieją
      const [existingSettings] = await db.query(
        'SELECT id FROM notification_settings WHERE user_id = ?',
        [userId]
      );
      
      if (existingSettings.length === 0) {
        // Utwórz nowe ustawienia
        await db.query(
          'INSERT INTO notification_settings (user_id, email_notifications, push_notifications, sms_notifications, min_profit_threshold) VALUES (?, ?, ?, ?, ?)',
          [userId, email_notifications, push_notifications, sms_notifications, min_profit_threshold]
        );
      } else {
        // Aktualizuj istniejące ustawienia
        await db.query(
          'UPDATE notification_settings SET email_notifications = ?, push_notifications = ?, sms_notifications = ?, min_profit_threshold = ? WHERE user_id = ?',
          [email_notifications, push_notifications, sms_notifications, min_profit_threshold, userId]
        );
      }
      
      res.json({
        success: true,
        message: 'Ustawienia powiadomień zaktualizowane pomyślnie'
      });
    } catch (error) {
      console.error('Błąd podczas aktualizacji ustawień powiadomień:', error);
      res.status(500).json({ success: false, message: 'Wystąpił błąd podczas aktualizacji ustawień powiadomień' });
    }
  });
  
  // Pobieranie ustawień powiadomień
  router.get('/settings', async (req, res) => {
    try {
      const db = req.app.locals.db;
      const userId = req.user.id;
      
      const [settings] = await db.query(
        'SELECT * FROM notification_settings WHERE user_id = ?',
        [userId]
      );
      
      if (settings.length === 0) {
        // Domyślne ustawienia, jeśli nie znaleziono
        return res.json({
          success: true,
          settings: {
            email_notifications: true,
            push_notifications: false,
            sms_notifications: false,
            min_profit_threshold: 10
          }
        });
      }
      
      res.json({
        success: true,
        settings: settings[0]
      });
    } catch (error) {
      console.error('Błąd podczas pobierania ustawień powiadomień:', error);
      res.status(500).json({ success: false, message: 'Wystąpił błąd podczas pobierania ustawień powiadomień' });
    }
  });
  
  module.exports = router;
  