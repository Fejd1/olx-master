// routes/items.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Middleware autoryzacji dla wszystkich tras
router.use(authMiddleware);

// Pobieranie wszystkich monitorowanych przedmiotów użytkownika
router.get('/', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const userId = req.user.id;

        const [items] = await db.query(
            'SELECT * FROM monitored_items WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );

        res.json({
            success: true,
            items
        });
    } catch (error) {
        console.error('Błąd podczas pobierania przedmiotów:', error);
        res.status(500).json({ success: false, message: 'Wystąpił błąd podczas pobierania przedmiotów' });
    }
});

// Dodawanie nowego przedmiotu do monitorowania
// Dodawanie nowego przedmiotu z URL OLX
router.post('/', authMiddleware, async (req, res) => {
    try {
      const db = req.app.locals.db;
      const userId = req.user.id;
      
      const { name, olx_url } = req.body;
      
      if (!name) {
        return res.status(400).json({ success: false, message: 'Nazwa przedmiotu jest wymagana' });
      }
      
      if (!olx_url || !olx_url.startsWith('https://www.olx.pl/')) {
        return res.status(400).json({ success: false, message: 'Prawidłowy URL z OLX jest wymagany' });
      }
      
      const [result] = await db.query(
        'INSERT INTO monitored_items (user_id, name, olx_url) VALUES (?, ?, ?)',
        [userId, name, olx_url]
      );
      
      const [newItem] = await db.query('SELECT * FROM monitored_items WHERE id = ?', [result.insertId]);
      
      res.status(201).json({
        success: true,
        message: 'Przedmiot dodany pomyślnie',
        item: newItem[0]
      });
    } catch (error) {
      console.error('Błąd podczas dodawania przedmiotu:', error);
      res.status(500).json({ success: false, message: 'Wystąpił błąd podczas dodawania przedmiotu' });
    }
  });
  
  // Aktualizacja przedmiotu z URL OLX
  router.put('/:id', authMiddleware, async (req, res) => {
    try {
      const db = req.app.locals.db;
      const userId = req.user.id;
      const itemId = req.params.id;
      
      const { name, olx_url } = req.body;
      
      if (!name) {
        return res.status(400).json({ success: false, message: 'Nazwa przedmiotu jest wymagana' });
      }
      
      if (!olx_url || !olx_url.startsWith('https://www.olx.pl/')) {
        return res.status(400).json({ success: false, message: 'Prawidłowy URL z OLX jest wymagany' });
      }
      
      // Sprawdź, czy przedmiot należy do użytkownika
      const [items] = await db.query('SELECT * FROM monitored_items WHERE id = ? AND user_id = ?', [itemId, userId]);
      
      if (items.length === 0) {
        return res.status(404).json({ success: false, message: 'Przedmiot nie znaleziony' });
      }
      
      await db.query(
        'UPDATE monitored_items SET name = ?, olx_url = ? WHERE id = ?',
        [name, olx_url, itemId]
      );
      
      const [updatedItem] = await db.query('SELECT * FROM monitored_items WHERE id = ?', [itemId]);
      
      res.json({
        success: true,
        message: 'Przedmiot zaktualizowany pomyślnie',
        item: updatedItem[0]
      });
    } catch (error) {
      console.error('Błąd podczas aktualizacji przedmiotu:', error);
      res.status(500).json({ success: false, message: 'Wystąpił błąd podczas aktualizacji przedmiotu' });
    }
  });
  
// Pobieranie szczegółów przedmiotu
// routes/items.js (kontynuacja)
router.get('/:id', async (req, res) => {
    try {
        const itemId = req.params.id;
        const db = req.app.locals.db;
        const userId = req.user.id;

        const [items] = await db.query(
            'SELECT * FROM monitored_items WHERE id = ? AND user_id = ?',
            [itemId, userId]
        );

        if (items.length === 0) {
            return res.status(404).json({ success: false, message: 'Przedmiot nie znaleziony' });
        }

        res.json({
            success: true,
            item: items[0]
        });
    } catch (error) {
        console.error('Błąd podczas pobierania szczegółów przedmiotu:', error);
        res.status(500).json({ success: false, message: 'Wystąpił błąd podczas pobierania szczegółów przedmiotu' });
    }
});

// Aktualizacja przedmiotu


// Usuwanie przedmiotu
router.delete('/:id', async (req, res) => {
    try {
        const itemId = req.params.id;
        const db = req.app.locals.db;
        const userId = req.user.id;

        // Sprawdź, czy przedmiot istnieje i należy do użytkownika
        const [items] = await db.query(
            'SELECT id FROM monitored_items WHERE id = ? AND user_id = ?',
            [itemId, userId]
        );

        if (items.length === 0) {
            return res.status(404).json({ success: false, message: 'Przedmiot nie znaleziony' });
        }

        // Usuń przedmiot
        await db.query('DELETE FROM monitored_items WHERE id = ?', [itemId]);

        res.json({
            success: true,
            message: 'Przedmiot usunięty pomyślnie'
        });
    } catch (error) {
        console.error('Błąd podczas usuwania przedmiotu:', error);
        res.status(500).json({ success: false, message: 'Wystąpił błąd podczas usuwania przedmiotu' });
    }
});

// Pobieranie ogłoszeń dla danego przedmiotu
router.get('/:id/listings', async (req, res) => {
    try {
        const itemId = req.params.id;
        const db = req.app.locals.db;
        const userId = req.user.id;

        // Sprawdź, czy przedmiot istnieje i należy do użytkownika
        const [items] = await db.query(
            'SELECT id FROM monitored_items WHERE id = ? AND user_id = ?',
            [itemId, userId]
        );

        if (items.length === 0) {
            return res.status(404).json({ success: false, message: 'Przedmiot nie znaleziony' });
        }

        // Pobierz ogłoszenia dla przedmiotu
        const [listings] = await db.query(
            'SELECT * FROM listings WHERE monitored_item_id = ? ORDER BY profit_potential DESC, created_at DESC',
            [itemId]
        );

        res.json({
            success: true,
            listings
        });
    } catch (error) {
        console.error('Błąd podczas pobierania ogłoszeń:', error);
        res.status(500).json({ success: false, message: 'Wystąpił błąd podczas pobierania ogłoszeń' });
    }
});

// Dodaj na końcu pliku routes/items.js
router.post('/trigger-scraper', authMiddleware, async (req, res) => {
    try {
        const db = req.app.locals.db;
        console.log('Ręczne uruchomienie scrapera...');
        await scraperService.scrapeListings(db);
        res.json({ success: true, message: 'Scraper uruchomiony pomyślnie' });
    } catch (error) {
        console.error('Błąd podczas uruchamiania scrapera:', error);
        res.status(500).json({ success: false, message: 'Wystąpił błąd podczas uruchamiania scrapera' });
    }
});


module.exports = router;
