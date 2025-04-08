// services/notificationService.js
const nodemailer = require('nodemailer');
const webpush = require('web-push');
const twilio = require('twilio');

// Konfiguracja usług powiadomień
const emailTransporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

webpush.setVapidDetails(
  'mailto:' + process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Wysyłanie powiadomień email
async function sendEmailNotification(userEmail, listing, monitoredItemName) {
  try {
    await emailTransporter.sendMail({
      from: `"OLX Monitor" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `Znaleziono nową okazję: ${listing.title}`,
      html: `
        <h2>Znaleziono nową okazję dla "${monitoredItemName}"</h2>
        <p><strong>Tytuł:</strong> ${listing.title}</p>
        <p><strong>Cena:</strong> ${listing.price} zł</p>
        <p><strong>Lokalizacja:</strong> ${listing.location}</p>
        <p><strong>Potencjalny zysk:</strong> ${listing.profit_potential.toFixed(2)}%</p>
        <p><a href="${listing.url}" target="_blank">Zobacz ogłoszenie na OLX</a></p>
        <img src="${listing.image_url}" alt="${listing.title}" style="max-width: 300px;" />
      `
    });
    
    return true;
  } catch (error) {
    console.error('Błąd podczas wysyłania powiadomienia email:', error);
    return false;
  }
}

// Wysyłanie powiadomień push
async function sendPushNotification(subscription, listing, monitoredItemName) {
  try {
    const payload = JSON.stringify({
      title: `Nowa okazja: ${listing.title}`,
      body: `Znaleziono nową okazję dla "${monitoredItemName}" z potencjalnym zyskiem ${listing.profit_potential.toFixed(2)}%`,
      icon: listing.image_url || '/logo.png',
      url: listing.url
    });
    
    await webpush.sendNotification(subscription, payload);
    
    return true;
  } catch (error) {
    console.error('Błąd podczas wysyłania powiadomienia push:', error);
    return false;
  }
}

// Wysyłanie powiadomień SMS
async function sendSmsNotification(phoneNumber, listing, monitoredItemName) {
  try {
    await twilioClient.messages.create({
      body: `OLX Monitor: Znaleziono nową okazję dla "${monitoredItemName}": ${listing.title} za ${listing.price} zł. Potencjalny zysk: ${listing.profit_potential.toFixed(2)}%. Sprawdź aplikację, aby zobaczyć szczegóły.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
    
    return true;
  } catch (error) {
    console.error('Błąd podczas wysyłania powiadomienia SMS:', error);
    return false;
  }
}

// Wysyłanie powiadomień do użytkownika
async function sendNotifications(db, userId, listingId) {
  try {
    // Pobierz dane użytkownika
    const [users] = await db.query('SELECT email FROM users WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      return false;
    }
    
    const userEmail = users[0].email;
    
    // Pobierz dane ogłoszenia i monitorowanego przedmiotu
    const [listings] = await db.query(
      `SELECT l.*, m.name as monitored_item_name 
       FROM listings l 
       JOIN monitored_items m ON l.monitored_item_id = m.id 
       WHERE l.id = ?`,
      [listingId]
    );
    
    if (listings.length === 0) {
      return false;
    }
    
    const listing = listings[0];
    
    // Pobierz ustawienia powiadomień użytkownika
    const [settings] = await db.query('SELECT * FROM notification_settings WHERE user_id = ?', [userId]);
    
    const userSettings = settings.length > 0 ? settings[0] : {
      email_notifications: true,
      push_notifications: false,
      sms_notifications: false,
      min_profit_threshold: 10
    };
    
    // Sprawdź, czy potencjał zysku przekracza próg
    if (listing.profit_potential < userSettings.min_profit_threshold) {
      return false;
    }
    
    // Wysyłaj powiadomienia zgodnie z ustawieniami
    if (userSettings.email_notifications) {
      await sendEmailNotification(userEmail, listing, listing.monitored_item_name);
      
      // Aktualizuj status powiadomienia
      await db.query(
        'UPDATE notifications SET status = "sent" WHERE id = ? AND type = "email"',
        [listingId]
      );
    }
    
    if (userSettings.push_notifications) {
      // Pobierz subskrypcje push użytkownika
      const [subscriptions] = await db.query('SELECT subscription FROM push_subscriptions WHERE user_id = ?', [userId]);
      
      for (const sub of subscriptions) {
        const subscription = JSON.parse(sub.subscription);
        await sendPushNotification(subscription, listing, listing.monitored_item_name);
      }
      
      // Aktualizuj status powiadomienia
      await db.query(
        'UPDATE notifications SET status = "sent" WHERE id = ? AND type = "push"',
        [listingId]
      );
    }
    
    if (userSettings.sms_notifications) {
      // Pobierz numer telefonu użytkownika
      const [phones] = await db.query('SELECT phone_number FROM user_phones WHERE user_id = ?', [userId]);
      
      if (phones.length > 0) {
        await sendSmsNotification(phones[0].phone_number, listing, listing.monitored_item_name);
        
        // Aktualizuj status powiadomienia
        await db.query(
          'UPDATE notifications SET status = "sent" WHERE id = ? AND type = "sms"',
          [listingId]
        );
      }
    }
    
    return true;
  } catch (error) {
    console.error('Błąd podczas wysyłania powiadomień:', error);
    return false;
  }
}

module.exports = {
  sendEmailNotification,
  sendPushNotification,
  sendSmsNotification,
  sendNotifications
};
