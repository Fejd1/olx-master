// services/scraperService.js
const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const aiService = require('./aiService');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36'
];


const MAX_REQUESTS_PER_MINUTE = 10;
const requestTimestamps = [];

// Funkcja do sprawdzania, czy możemy wykonać kolejne żądanie
async function canMakeRequest() {
  const now = Date.now();
  // Usuń stare timestampy (starsze niż minuta)
  while (requestTimestamps.length > 0 && requestTimestamps[0] < now - 60000) {
    requestTimestamps.shift();
  }
  
  // Sprawdź, czy nie przekroczyliśmy limitu
  if (requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    console.log(`Osiągnięto limit żądań (${MAX_REQUESTS_PER_MINUTE}/min). Czekam...`);
    // Czekaj, aż będzie można wykonać kolejne żądanie
    const waitTime = 60000 - (now - requestTimestamps[0]) + 1000; // +1s zapasu
    await new Promise(resolve => setTimeout(resolve, waitTime));
    return canMakeRequest(); // Rekurencyjnie sprawdź ponownie
  }
  
  // Dodaj aktualny timestamp
  requestTimestamps.push(now);
  return true;
}

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
      
      // Użyj bezpośrednio URL z OLX jeśli jest dostępny, w przeciwnym razie zbuduj URL
      let searchUrl;
      
      if (item.olx_url && item.olx_url.startsWith('https://www.olx.pl/')) {
        searchUrl = item.olx_url;
        
        // Dodaj dodatkowe filtry, jeśli zostały określone
        const url = new URL(searchUrl);
        
        if (item.min_price) {
          url.searchParams.set('search[filter_float_price:from]', item.min_price);
        }
        
        if (item.max_price) {
          url.searchParams.set('search[filter_float_price:to]', item.max_price);
        }
        
        if (item.item_condition !== 'any') {
          url.searchParams.set('search[filter_enum_state]', item.item_condition === 'new' ? '1' : '2');
        }
        
        searchUrl = url.toString();
      } else {
        // Budowanie URL wyszukiwania na podstawie parametrów przedmiotu (stara metoda)
        const formattedName = encodeURIComponent(item.name).replace(/%20/g, '-');
        searchUrl = `https://www.olx.pl/oferty/q-${formattedName}/`;
        
        // Dodaj parametry filtrowania
        const params = new URLSearchParams();
        
        if (item.min_price) {
          params.append('search[filter_float_price:from]', item.min_price);
        }
        
        if (item.max_price) {
          params.append('search[filter_float_price:to]', item.max_price);
        }
        
        if (item.location) {
          params.append('search[district_id]', item.location);
        }
        
        if (item.item_condition !== 'any') {
          params.append('search[filter_enum_state]', item.item_condition === 'new' ? '1' : '2');
        }
        
        // Łączenie URL z parametrami
        const paramsString = params.toString();
        if (paramsString) {
          searchUrl += `?${paramsString}`;
        }
      }
      
      console.log(`Scrapowanie: ${searchUrl}`);
      await canMakeRequest();
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });
      
      // Reszta kodu pozostaje bez zmian...
    } catch (error) {
      console.error(`Błąd podczas scrapowania przedmiotu ${item.name}:`, error);
    } finally {
      await browser.close();
    }
  }

module.exports = {
  scrapeListings
};
