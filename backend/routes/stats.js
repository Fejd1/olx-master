// routes/stats.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Middleware autoryzacji dla wszystkich tras
router.use(authMiddleware);

// Pobieranie statystyk potencjału zysku
router.get('/profit-potential', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const userId = req.user.id;
    
    // Pobierz ogłoszenia z najwyższym potencjałem zysku
    const [topListings] = await db.query(
      `SELECT l.*, m.name as monitored_item_name 
       FROM listings l 
       JOIN monitored_items m ON l.monitored_item_id = m.id 
       WHERE m.user_id = ? 
       ORDER BY l.profit_potential DESC 
       LIMIT 10`,
      [userId]
    );
    
    // Pobierz średni potencjał zysku dla każdego monitorowanego przedmiotu
    const [itemStats] = await db.query(
      `SELECT m.id, m.name, 
              COUNT(l.id) as listing_count, 
              AVG(l.profit_potential) as avg_profit_potential,
              MAX(l.profit_potential) as max_profit_potential
       FROM monitored_items m 
       LEFT JOIN listings l ON m.id = l.monitored_item_id 
       WHERE m.user_id = ? 
       GROUP BY m.id 
       ORDER BY avg_profit_potential DESC`,
      [userId]
    );
    
    res.json({
      success: true,
      topListings,
      itemStats
    });
  } catch (error) {
    console.error('Błąd podczas pobierania statystyk potencjału zysku:', error);
    res.status(500).json({ success: false, message: 'Wystąpił błąd podczas pobierania statystyk potencjału zysku' });
  }
});

// Pobieranie trendów cenowych
router.get('/price-trends', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const userId = req.user.id;
    const { item_id, days = 30 } = req.query;
    
    let query;
    let params;
    
    if (item_id) {
      // Pobierz trendy cenowe dla konkretnego przedmiotu
      query = `
        SELECT DATE(ph.date) as date, AVG(ph.price) as avg_price, COUNT(DISTINCT l.id) as listing_count
        FROM price_history ph
        JOIN listings l ON ph.listing_id = l.id
        JOIN monitored_items m ON l.monitored_item_id = m.id
        WHERE m.id = ? AND m.user_id = ? AND ph.date >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY DATE(ph.date)
        ORDER BY DATE(ph.date) ASC
      `;
      params = [item_id, userId, parseInt(days)];
    } else {
      // Pobierz trendy cenowe dla wszystkich przedmiotów użytkownika
      query = `
        SELECT DATE(ph.date) as date, m.name, AVG(ph.price) as avg_price, COUNT(DISTINCT l.id) as listing_count
        FROM price_history ph
        JOIN listings l ON ph.listing_id = l.id
        JOIN monitored_items m ON l.monitored_item_id = m.id
        WHERE m.user_id = ? AND ph.date >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY DATE(ph.date), m.id
        ORDER BY DATE(ph.date) ASC, m.name ASC
      `;
      params = [userId, parseInt(days)];
    }
    
    const [trends] = await db.query(query, params);
    
    res.json({
      success: true,
      trends
    });
  } catch (error) {
    console.error('Błąd podczas pobierania trendów cenowych:', error);
    res.status(500).json({ success: false, message: 'Wystąpił błąd podczas pobierania trendów cenowych' });
  }
});

// Pobieranie dashboardu z podsumowaniem
router.get('/dashboard', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const userId = req.user.id;
    
    // Pobierz liczbę monitorowanych przedmiotów
    const [itemsCount] = await db.query(
      'SELECT COUNT(*) as count FROM monitored_items WHERE user_id = ?',
      [userId]
    );
    
    // Pobierz liczbę znalezionych ogłoszeń
    const [listingsCount] = await db.query(
      `SELECT COUNT(*) as count 
       FROM listings l 
       JOIN monitored_items m ON l.monitored_item_id = m.id 
       WHERE m.user_id = ?`,
      [userId]
    );
    
    // Pobierz liczbę nowych ogłoszeń z ostatnich 24 godzin
    const [newListingsCount] = await db.query(
      `SELECT COUNT(*) as count 
       FROM listings l 
       JOIN monitored_items m ON l.monitored_item_id = m.id 
       WHERE m.user_id = ? AND l.created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)`,
      [userId]
    );
    
    // Pobierz ogłoszenia z najwyższym potencjałem zysku
    const [topDeals] = await db.query(
      `SELECT l.*, m.name as monitored_item_name 
       FROM listings l 
       JOIN monitored_items m ON l.monitored_item_id = m.id 
       WHERE m.user_id = ? 
       ORDER BY l.profit_potential DESC 
       LIMIT 5`,
      [userId]
    );
    
    // Pobierz liczbę ogłoszeń według kategorii
    const [categoryCounts] = await db.query(
      `SELECT m.category, COUNT(l.id) as count 
       FROM listings l 
       JOIN monitored_items m ON l.monitored_item_id = m.id 
       WHERE m.user_id = ? 
       GROUP BY m.category`,
      [userId]
    );
    
    res.json({
      success: true,
      stats: {
        itemsCount: itemsCount[0].count,
        listingsCount: listingsCount[0].count,
        newListingsCount: newListingsCount[0].count
      },
      topDeals,
      categoryCounts
    });
  } catch (error) {
    console.error('Błąd podczas pobierania danych dashboardu:', error);
    res.status(500).json({ success: false, message: 'Wystąpił błąd podczas pobierania danych dashboardu' });
  }
});

module.exports = router;
