// routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
// Rejestracja nowego użytkownika
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Wszystkie pola są wymagane' });
    }
    
    const db = req.app.locals.db;
    
    // Sprawdź, czy użytkownik już istnieje
    const [existingUser] = await db.query('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
    
    if (existingUser.length > 0) {
      return res.status(409).json({ success: false, message: 'Użytkownik o podanym emailu lub nazwie już istnieje' });
    }
    
    // Hashowanie hasła
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Zapisz użytkownika do bazy danych
    const [result] = await db.query(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );
    
    // Wygeneruj token JWT
    const token = jwt.sign(
      { id: result.insertId, username, email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      success: true,
      message: 'Użytkownik zarejestrowany pomyślnie',
      token,
      user: { id: result.insertId, username, email }
    });
  } catch (error) {
    console.error('Błąd podczas rejestracji:', error);
    res.status(500).json({ success: false, message: 'Wystąpił błąd podczas rejestracji' });
  }
});

// Logowanie użytkownika
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email i hasło są wymagane' });
    }
    
    const db = req.app.locals.db;
    
    // Znajdź użytkownika w bazie danych
    const [users] = await db.query('SELECT id, username, email, password_hash FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Nieprawidłowy email lub hasło' });
    }
    
    const user = users[0];
    
    // Porównaj hasło
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Nieprawidłowy email lub hasło' });
    }
    
    // Aktualizuj datę ostatniego logowania
    await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
    
    // Wygeneruj token JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      message: 'Logowanie pomyślne',
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('Błąd podczas logowania:', error);
    res.status(500).json({ success: false, message: 'Wystąpił błąd podczas logowania' });
  }
});

// Pobieranie danych użytkownika
router.get('/user', authMiddleware, async (req, res) => {
    try {
      const db = req.app.locals.db;
      const userId = req.user.id;
      
      // Pobierz dane użytkownika
      const [users] = await db.query('SELECT id, username, email, created_at, last_login FROM users WHERE id = ?', [userId]);
      
      if (users.length === 0) {
        return res.status(404).json({ success: false, message: 'Użytkownik nie znaleziony' });
      }
      
      res.json({
        success: true,
        user: users[0]
      });
    } catch (error) {
      console.error('Błąd podczas pobierania danych użytkownika:', error);
      res.status(500).json({ success: false, message: 'Wystąpił błąd podczas pobierania danych użytkownika' });
    }
  });

module.exports = router;
