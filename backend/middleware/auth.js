// middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    // Pobierz token z nagłówka
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Brak tokenu autoryzacyjnego' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Weryfikuj token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Dodaj dane użytkownika do obiektu żądania
    req.user = decoded;
    
    next();
  } catch (error) {
    console.error('Błąd autoryzacji:', error);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Nieprawidłowy lub wygasły token' });
    }
    
    res.status(500).json({ success: false, message: 'Wystąpił błąd podczas autoryzacji' });
  }
};
