// server.js - Główny plik serwera
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const cron = require('node-cron');
const scraperService = require('./services/scraperService');

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Połączenie z bazą danych MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Eksport połączenia do wykorzystania w innych modułach
app.locals.db = pool;

// Harmonogram scrapowania (co 30 minut)
cron.schedule('*/30 * * * *', async () => {
    console.log('Uruchamianie scrapera OLX...');
    await scraperService.scrapeListings(pool);
  });
  

// Importowanie routerów
const authRoutes = require('./routes/auth');
const itemsRoutes = require('./routes/items');
const listingsRoutes = require('./routes/listings');
const statsRoutes = require('./routes/stats');
const notificationsRoutes = require('./routes/notifications');

// Rejestracja routerów
app.use('/api/auth', authRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/notifications', notificationsRoutes);

// Obsługa błędów
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Wystąpił błąd serwera',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.post('/api/scraper/trigger', async (req, res) => {
    try {
      console.log('Ręczne uruchamianie scrapera OLX...');
      await scraperService.scrapeListings(pool);
      res.json({ success: true, message: 'Scraper uruchomiony pomyślnie' });
    } catch (error) {
      console.error('Błąd podczas uruchamiania scrapera:', error);
      res.status(500).json({ success: false, message: 'Wystąpił błąd podczas uruchamiania scrapera' });
    }
  });

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Serwer działa na porcie ${PORT}`);
});
