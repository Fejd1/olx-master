// services/scraperService.js
const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const aiService = require('./aiService');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36'
];

async function scrapeListings(pool) {
  try {
    // Pobierz wszystkie monitorowane przedmioty
    const [items] = await pool.query('SELECT * FROM monitored_items');
    
    for (const item of items) {
      await scrapeItemListings(pool, item);
      // Opóźnienie między scrapowaniem różnych przedmiotów, aby uniknąć blokady
      await new Promise(resolve => setTimeout(resolve, 5000 + Math.random() * 5000));
    }
  } catch (error) {
    console.error('Błąd podczas scrapowania:', error);
  }
}

async function scrapeItemListings(pool, item) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Rotacja User-Agent
    const randomUserAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    await page.setUserAgent(randomUserAgent);
    
    // Budowanie URL wyszukiwania na podstawie parametrów przedmiotu
    let searchUrl = `https://www.olx.pl/oferty/q-${encodeURIComponent(item.name)}/`;
    
    if (item.category) {
      searchUrl += `?category_id=${item.category}`;
    }
    
    if (item.min_price || item.max_price) {
      searchUrl += searchUrl.includes('?') ? '&' : '?';
      if (item.min_price) searchUrl += `search[filter_float_price:from]=${item.min_price}`;
      if (item.min_price && item.max_price) searchUrl += '&';
      if (item.max_price) searchUrl += `search[filter_float_price:to]=${item.max_price}`;
    }
    
    if (item.location) {
      searchUrl += searchUrl.includes('?') ? '&' : '?';
      searchUrl += `search[district_id]=${item.location}`;
    }
    
    if (item.item_condition !== 'any') {
      searchUrl += searchUrl.includes('?') ? '&' : '?';
      searchUrl += `search[filter_enum_state]=${item.item_condition === 'new' ? '1' : '2'}`;
    }
    
    console.log(`Scrapowanie: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'networkidle2' });
    
    // Czekaj na załadowanie wyników
    await page.waitForSelector('.css-rc5s2u', { timeout: 10000 }).catch(() => console.log('Timeout waiting for listings'));
    
    // Pobierz wszystkie ogłoszenia ze strony
    const listings = await page.evaluate(() => {
      const results = [];
      const listingElements = document.querySelectorAll('.css-rc5s2u');
      
      listingElements.forEach(element => {
        try {
          const titleElement = element.querySelector('h6');
          const priceElement = element.querySelector('.css-10b0gli');
          const locationElement = element.querySelector('.css-veheph');
          const imageElement = element.querySelector('img');
          const linkElement = element.querySelector('a');
          
          if (titleElement && priceElement && linkElement) {
            const title = titleElement.textContent.trim();
            const priceText = priceElement.textContent.trim();
            const price = parseFloat(priceText.replace(/[^\d,]/g, '').replace(',', '.'));
            const location = locationElement ? locationElement.textContent.trim() : '';
            const imageUrl = imageElement ? imageElement.src : '';
            const url = linkElement.href;
            const olxId = url.split('/').pop().split('.')[0];
            
            results.push({
              title,
              price,
              location,
              imageUrl,
              url,
              olxId
            });
          }
        } catch (e) {
          console.error('Błąd podczas parsowania elementu:', e);
        }
      });
      
      return results;
    });
    
    console.log(`Znaleziono ${listings.length} ogłoszeń dla "${item.name}"`);
    
    // Przetwarzanie i zapisywanie ogłoszeń
    for (const listing of listings) {
      // Sprawdź, czy ogłoszenie już istnieje
      const [existingListing] = await pool.query('SELECT id FROM listings WHERE olx_id = ?', [listing.olxId]);
      
      if (existingListing.length === 0) {
        // Pobierz szczegóły ogłoszenia
        await page.goto(listing.url, { waitUntil: 'networkidle2' });
        
        const details = await page.evaluate(() => {
          const descriptionElement = document.querySelector('[data-cy="ad_description"]');
          const sellerIdElement = document.querySelector('[data-cy="seller-link"]');
          const conditionElement = document.querySelector('.css-b5m1rv span:contains("Stan:")');
          
          return {
            description: descriptionElement ? descriptionElement.textContent.trim() : '',
            sellerId: sellerIdElement ? sellerIdElement.href.split('/').pop() : '',
            condition: conditionElement ? (conditionElement.nextElementSibling.textContent.toLowerCase().includes('nowy') ? 'new' : 'used') : 'used'
          };
        });
        
        // Analiza AI
        const authenticityScore = await aiService.checkAuthenticity(listing.title, details.description);
        const profitPotential = await aiService.calculateProfitPotential(item.name, listing.price);
        
        // Zapisz ogłoszenie do bazy danych
        const [result] = await pool.query(
          'INSERT INTO listings (monitored_item_id, olx_id, title, price, location, item_condition, url, image_url, description, seller_id, profit_potential, authenticity_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [item.id, listing.olxId, listing.title, listing.price, listing.location, details.condition, listing.url, listing.imageUrl, details.description, details.sellerId, profitPotential, authenticityScore]
        );
        
        // Zapisz historię cen
        if (result.insertId) {
          await pool.query(
            'INSERT INTO price_history (listing_id, price) VALUES (?, ?)',
            [result.insertId, listing.price]
          );
          
          // Utwórz powiadomienie dla użytkownika, jeśli potencjał zysku jest wysoki
          if (profitPotential > 20) {
            await pool.query(
              'INSERT INTO notifications (user_id, listing_id, type) VALUES (?, ?, ?)',
              [item.user_id, result.insertId, 'email']
            );
          }
        }
      } else {
        // Aktualizuj cenę, jeśli ogłoszenie już istnieje
        const listingId = existingListing[0].id;
        await pool.query('UPDATE listings SET price = ?, updated_at = NOW() WHERE id = ?', [listing.price, listingId]);
        
        // Dodaj nowy wpis do historii cen, jeśli cena się zmieniła
        const [currentPrice] = await pool.query('SELECT price FROM price_history WHERE listing_id = ? ORDER BY date DESC LIMIT 1', [listingId]);
        
        if (currentPrice.length === 0 || currentPrice[0].price !== listing.price) {
          await pool.query('INSERT INTO price_history (listing_id, price) VALUES (?, ?)', [listingId, listing.price]);
        }
      }
      
      // Opóźnienie między przetwarzaniem ogłoszeń
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    }
  } catch (error) {
    console.error(`Błąd podczas scrapowania przedmiotu ${item.name}:`, error);
  } finally {
    await browser.close();
  }
}

module.exports = {
  scrapeListings
};
