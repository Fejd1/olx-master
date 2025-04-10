const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');


puppeteer.use(StealthPlugin());
const cheerio = require("cheerio")
// Lista User-Agents do rotacji
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.101 Safari/537.36'
];
const CONCURRENT_LIMIT = 3
const MAX_REQUESTS_PER_MINUTE = 10;
const requestTimestamps = [];

// Funkcja do sprawdzania, czy możemy wykonać kolejne żądanie
async function canMakeRequest() {
  const now = Date.now();
  // Usuń stare timestampy (starsze niż minuta)
  while (requestTimestamps.length > 0 && requestTimestamps[0] < now - 60000) {
    requestTimestamps.shift();
  }
  
  if (requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    console.log(`Osiągnięto limit żądań (${MAX_REQUESTS_PER_MINUTE}/min). Czekam...`);
    const waitTime = 60000 - (now - requestTimestamps[0]) + 1000; // +1s zapasu
    await new Promise(resolve => setTimeout(resolve, waitTime));
    return canMakeRequest();
  }
  
  requestTimestamps.push(now);
  return true;
}
async function scrapeListings(pool) {
  const pLimit = await import('p-limit').then(mod => mod.default);
  try {
    const [items] = await pool.query('SELECT * FROM monitored_items');
    console.log(`Znaleziono ${items.length} przedmiotów do monitorowania`);

    const limit = pLimit(CONCURRENT_LIMIT);

    const tasks = items.map(item => limit(async () => {
      try {
        console.log(`Rozpoczynam scrapowanie dla przedmiotu: ${item.name}`);
        if (item.olx_url && item.olx_url.startsWith('https://www.olx.pl/')) {
          await scrapeItemByUrl(pool, item);
        } else {
          console.log(`Przedmiot ${item.name} nie ma prawidłowego URL OLX`);
        }
      } catch (error) {
        console.error(`Błąd podczas scrapowania przedmiotu ${item.name}:`, error);
      }
    }));

    await Promise.allSettled(tasks);
    console.log("✅ Wszystkie zadania scrapujące zakończone");

  } catch (error) {
    console.error('Błąd podczas scrapowania ogłoszeń:', error);
  }
}

async function scrapeItemByUrl(pool, item) {
  console.log(`Rozpoczynam scrapowanie URL: ${item.olx_url}`);
  
  if (!item.olx_url || !item.olx_url.startsWith('https://www.olx.pl/')) {
    console.error(`Nieprawidłowy URL dla przedmiotu ${item.name}: ${item.olx_url}`);
    return;
  }

  const url = new URL(item.olx_url);
  console.log('Parametry URL:', url.search);

  // Dodaj proxy do opcji - jeśli posiadasz serwer proxy, odkomentuj poniższą linię i ustaw właściwy adres
  const browser = await puppeteer.launch({ 
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      // '--proxy-server=http://your-proxy-server:port'
    ]
  });
  
  try {
    const page = await browser.newPage();
    
    // Rotacja User-Agent
    const randomUserAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    await page.setUserAgent(randomUserAgent);
    
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
      'User-Agent': randomUserAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Connection': 'keep-alive',
      'Cache-Control': 'max-age=0',
      'Upgrade-Insecure-Requests': '1'
    });

    // Losowe opóźnienie, aby symulować zachowanie użytkownika
    const randomDelay = Math.floor(Math.random() * 3000) + 2000; // 2-5 sekund
    console.log(`Czekam ${randomDelay}ms przed przejściem do URL...`);
    await new Promise(resolve => setTimeout(resolve, randomDelay));
    
    const searchUrl = item.olx_url;
    console.log(`Scrapowanie: ${searchUrl}`);
    await canMakeRequest();
    // Załaduj stronę
    await page.goto(searchUrl, { waitUntil: 'networkidle2' });
    console.log(`Strona ${searchUrl} została załadowana.`);

    // Log tytułu strony, aby upewnić się, że strona się załadowała
    const pageTitle = await page.title();
    console.log(`Tytuł strony: ${pageTitle}`);

    // Opcjonalnie: zapisz zrzut ekranu do pliku, by wizualnie potwierdzić poprawność strony
    await page.screenshot({ path: `loadedPage-${Date.now()}.png` });
      
    console.log('Strona załadowana, czekam na elementy...');

    // Sprawdzenie, czy występuje CAPTCHA lub inne oznaki blokady
    const hasCaptcha = await page.evaluate(() => {
      return document.querySelector('.g-recaptcha') !== null || 
             document.querySelector('[data-sitekey]') !== null ||
             document.body.textContent.toLowerCase().includes('captcha');
    });

    if (hasCaptcha) {
      console.error('Wykryto CAPTCHA lub blokadę scraper\'a! Sprawdź, czy scraper został zablokowany.');
      await page.screenshot({ path: `captcha-${Date.now()}.png` });
      return;
    } else {
      console.log('Brak CAPTCHA - scraper działa poprawnie.');
    }

    const totalPages = await page.evaluate(() => {
      const paginationItems = document.querySelectorAll('.pagination-list .pagination-item');
      let maxPage = 1;
      paginationItems.forEach(item => {
        const pageNumber = parseInt(item.textContent.trim());
        if (pageNumber > maxPage) {
          maxPage = pageNumber;
        }
      });
      return maxPage;
    });

    console.log(`Liczba stron: ${totalPages}`);

    // Sprawdzenie, czy są wyniki wyszukiwania
    const hasNoResults = await page.evaluate(() => {
      return document.body.textContent.includes('Nie znaleźliśmy ogłoszeń dla tego zapytania') ||
             document.querySelector('.emptynew') !== null;
    });
    
    if (hasNoResults) {
      console.log('Brak wyników dla tego wyszukiwania.');
      return;
    }
    
    // Wybór selektora dla ogłoszeń
    const listingSelectors = [
      '.css-rc5s2u', 
      'div[data-cy="l-card"]',
      '.css-1sw7q4x',
      '.css-qfzx1y',
      '.offer-wrapper', 
      '.listing-grid-container .offer',
      'div[data-testid="listing-grid"] > div'
    ];
    
    
    
    let listingSelector = '.css-qfzx1y';
    // for (const selector of listingSelectors) {
    //   if (await page.$(selector) !== null) {
    //     listingSelector = selector;
    //     break;
    //   }
    // }
    
    if (!listingSelector) {
      console.log('Nie znaleziono selektora dla ogłoszeń');
      return;
    }
    
    console.log(`Używam selektora: ${listingSelector}`);
    await page.waitForSelector(listingSelector, { timeout: 10000 }).catch(() => console.log('Timeout oczekiwania na selektor ogłoszeń'));
    
    // Pobranie ogłoszeń ze strony
    const allListings = [];
    for (let pageIndex = 1; pageIndex <= totalPages; pageIndex++) {
      const pageUrl = searchUrl.includes('?') ? `${searchUrl}&page=${pageIndex}` : `${searchUrl}?page=${pageIndex}`;
      console.log(`Pobieram stronę ${pageIndex}: ${pageUrl}`);

      await canMakeRequest();
      await page.goto(pageUrl, { waitUntil: 'networkidle2' });

      // Pobierz ogłoszenia z bieżącej strony
      const listings = await page.evaluate(() => {
        const results = [];
        const listingElements = document.querySelectorAll('.css-qfzx1y'); // Możesz dodać więcej selektorów, jeśli są inne
        listingElements.forEach(el => {
          results.push({
            text: el.textContent.trim(),
            html: el.innerHTML.trim()
          });
        });
        return results;
      });

      allListings.push(...listings); // Dodaj ogłoszenia z bieżącej strony do ogólnych wyników
    }

    console.log(`Zebrano ${allListings.length} ogłoszeń ze wszystkich stron`);
    
    // Przetwarzanie i zapisywanie ogłoszeń
    for (let i = 0; i < allListings.length; i++) {
      const listing = allListings[i];
      const progress = Math.floor((i / allListings.length) * 100); // Obliczanie postępu procentowego
      //const progressText = `[${progress}%] Przetwarzanie ogłoszenia ${i + 1} z ${allListings.length}...`;

      //console.log(progressText); // Wyświetlanie postępu

      const $ = cheerio.load(listing.html);
      const href = "https://olx.pl" + $('a.css-1tqlkj0').attr('href');
      const parts = href.split('-');
      const idWithSuffix = parts.slice(-2).join('-').replace('.html', '');
      
      const [existingListing] = await pool.query('SELECT id, price FROM listings WHERE olx_id = ?', [idWithSuffix]);

      if (existingListing.length === 0) {
        await canMakeRequest();
        await page.goto(href, { waitUntil: 'networkidle2' });
        console.log(`Pobrano stronę szczegółów dla ogłoszenia: ${listing.olxId}`);

        const details = await page.evaluate(() => {
          try {
            const descriptionElement = document.querySelector('.css-19duwlz');
            const paragraphs = document.querySelectorAll('.css-z0m36u');
            const usedConditionParagraph = Array.from(paragraphs).find(p => 
              ['Stan: Używane', 'Stan: Uszkodzone', 'Stan: Nowe'].some(condition => p.textContent.includes(condition))
            );
            if (usedConditionParagraph) {
              console.log(usedConditionParagraph.textContent);
            }
            const titleElement = document.querySelector('.css-10ofhqw');
            const priceElement = document.querySelector('.css-fqcbii');
            const location = document.querySelector('.css-7wnksb');
            const imageElement = document.querySelector('.css-1bmvjcs');
            const imageUrl = imageElement ? imageElement.src : null;
        
            const extractPrice = (priceText) => {
              const match = priceText.match(/[\d\s,]+/);
              if (match) {
                const cleanedPrice = match[0].replace(/\s/g, '').replace('zł', '').replace(',', '.');
                return cleanedPrice;
              }
              return '0';
            };
        
            return {
              description: descriptionElement ? descriptionElement.textContent.trim() : 'error',
              condition: usedConditionParagraph ? usedConditionParagraph.textContent : 'error',
              title: titleElement ? titleElement.textContent.trim() : 'error',
              price: priceElement ? extractPrice(priceElement.textContent.trim()) : '0',
              location: location ? location.textContent.trim() : 'error',
              url: imageUrl
            };
          } catch (err) {
            console.error("Błąd wewnątrz page.evaluate:", err);
            return {
              description: 'error',
              condition: 'error',
              title: 'error',
              price: '0',
              location: 'error',
              url: null
            };
          }
        });
        
        console.log(details.condition)
        const [result] = await pool.query(
          'INSERT INTO listings (monitored_item_id, olx_id, title, price, location, item_condition, url, image_url, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [item.id, idWithSuffix, details.title, details.price, details.location, details.condition, href, details.url, details.description]
        );

        if (result.insertId) {
          await pool.query(
            'INSERT INTO price_history (listing_id, price) VALUES (?, ?)',
            [result.insertId, details.price]
          );

          await pool.query(
            'INSERT INTO notifications (user_id, listing_id, type) VALUES (?, ?, ?)',
            [item.user_id, result.insertId, 'email']
          );
        }
      } else {
        const listingId = existingListing[0].id;
        const price = existingListing[0].price;
        await pool.query('UPDATE listings SET price = ?, updated_at = NOW() WHERE id = ?', [price, listingId]);

        const [currentPrice] = await pool.query('SELECT price FROM price_history WHERE listing_id = ? ORDER BY date DESC LIMIT 1', [listingId]);
        if (currentPrice.length === 0 || currentPrice[0].price !== price) {
          await pool.query('INSERT INTO price_history (listing_id, price) VALUES (?, ?)', [listingId, price]);
        }
      }

      const delayBetweenListings = 500 + Math.random() * 2000;
      console.log(`Opóźnienie ${Math.floor(delayBetweenListings)}ms przed przetwarzaniem kolejnego ogłoszenia...`);
      await new Promise(resolve => setTimeout(resolve, delayBetweenListings));
    }
    
    console.log(`Zakończono scrapowanie dla przedmiotu: ${item.name}`);
  } catch (error) {
    console.error(`Błąd podczas scrapowania przedmiotu ${item.name}:`, error);
  } finally {
    await browser.close();
  }
}

module.exports = {
  scrapeListings,
  scrapeItemByUrl
};