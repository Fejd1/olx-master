// routes/listings.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Middleware autoryzacji dla wszystkich tras
router.use(authMiddleware);

// Pobieranie wszystkich ogłoszeń dla użytkownika
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const userId = req.user.id;
    
    // Parametry filtrowania i sortowania
    const { sort = 'profit_potential', order = 'desc', limit = 50, offset = 0 } = req.query;
    
    // Walidacja parametrów sortowania
    const validSortFields = ['profit_potential', 'price', 'created_at', 'updated_at'];
    const validOrders = ['asc', 'desc'];
    
    const sortField = validSortFields.includes(sort) ? sort : 'profit_potential';
    const sortOrder = validOrders.includes(order.toLowerCase()) ? order.toLowerCase() : 'desc';
    
    // Pobierz ogłoszenia dla wszystkich monitorowanych przedmiotów użytkownika
    const [listings] = await db.query(
      `SELECT l.*, m.name as monitored_item_name 
       FROM listings l 
       JOIN monitored_items m ON l.monitored_item_id = m.id 
       WHERE m.user_id = ? 
       ORDER BY l.${sortField} ${sortOrder} 
       LIMIT ? OFFSET ?`,
      [userId, parseInt(limit), parseInt(offset)]
    );
    
    // Pobierz całkowitą liczbę ogłoszeń
    const [countResult] = await db.query(
      `SELECT COUNT(*) as total 
       FROM listings l 
       JOIN monitored_items m ON l.monitored_item_id = m.id 
       WHERE m.user_id = ?`,
      [userId]
    );
    
    const total = countResult[0].total;
    
    res.json({
      success: true,
      listings,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + listings.length < total
      }
    });
  } catch (error) {
    console.error('Błąd podczas pobierania ogłoszeń:', error);
    res.status(500).json({ success: false, message: 'Wystąpił błąd podczas pobierania ogłoszeń' });
  }
});

// Pobieranie szczegółów ogłoszenia
router.get('/:id', async (req, res) => {
  try {
    const listingId = req.params.id;
    const db = req.app.locals.db;
    const userId = req.user.id;
    
    // Pobierz ogłoszenie i sprawdź, czy należy do monitorowanego przedmiotu użytkownika
    const [listings] = await db.query(
      `SELECT l.*, m.name as monitored_item_name 
       FROM listings l 
       JOIN monitored_items m ON l.monitored_item_id = m.id 
       WHERE l.id = ? AND m.user_id = ?`,
      [listingId, userId]
    );
    
    if (listings.length === 0) {
      return res.status(404).json({ success: false, message: 'Ogłoszenie nie znalezione' });
    }
    
    // Pobierz historię cen dla ogłoszenia
    const [priceHistory] = await db.query(
      'SELECT * FROM price_history WHERE listing_id = ? ORDER BY date ASC',
      [listingId]
    );
    
    res.json({
      success: true,
      listing: listings[0],
      priceHistory
    });
  } catch (error) {
    console.error('Błąd podczas pobierania szczegółów ogłoszenia:', error);
    res.status(500).json({ success: false, message: 'Wystąpił błąd podczas pobierania szczegółów ogłoszenia' });
  }
});

module.exports = router;
