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
  try {
    // Pobierz wszystkie monitorowane przedmioty z bazy danych
    const [items] = await pool.query('SELECT * FROM monitored_items');    
    console.log(`Znaleziono ${items.length} przedmiotów do monitorowania`);
    // Dla każdego przedmiotu uruchom scrapowanie
    for (const item of [items].flat()) {
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
    }
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



// const puppeteer = require('puppeteer-extra');
// const StealthPlugin = require('puppeteer-extra-plugin-stealth');
// puppeteer.use(StealthPlugin());

// // Lista User-Agents do rotacji
// const USER_AGENTS = [
//   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
//   'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15',
//   'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
//   'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.101 Safari/537.36'
// ];

// const MAX_REQUESTS_PER_MINUTE = 10;
// const requestTimestamps = [];

// // Funkcja do sprawdzania, czy możemy wykonać kolejne żądanie
// async function canMakeRequest() {
//   const now = Date.now();
//   // Usuń stare timestampy (starsze niż minuta)
//   while (requestTimestamps.length > 0 && requestTimestamps[0] < now - 60000) {
//     requestTimestamps.shift();
//   }
  
//   if (requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
//     console.log(`Osiągnięto limit żądań (${MAX_REQUESTS_PER_MINUTE}/min). Czekam...`);
//     const waitTime = 60000 - (now - requestTimestamps[0]) + 1000; // +1s zapasu
//     await new Promise(resolve => setTimeout(resolve, waitTime));
//     return canMakeRequest();
//   }
  
//   requestTimestamps.push(now);
//   return true;
// }

// async function scrapeListings(pool) {
//   try {
//     // Pobierz wszystkie monitorowane przedmioty z bazy danych
//     const [items] = await pool.query('SELECT * FROM monitored_items');    
//     console.log(`Znaleziono ${items.length} przedmiotów do monitorowania`);
    
//     // Dla każdego przedmiotu uruchom scrapowanie
//     for (const item of items) {
//       try {
//         console.log(`Rozpoczynam scrapowanie dla przedmiotu: ${item.name}`);
//         if (item.olx_url && item.olx_url.startsWith('https://www.olx.pl/')) {
//           await scrapeItemByUrl(pool, item);
//         } else {
//           console.log(`Przedmiot ${item.name} nie ma prawidłowego URL OLX`);
//         }
//       } catch (error) {
//         console.error(`Błąd podczas scrapowania przedmiotu ${item.name}:`, error);
//       }
//     }
//   } catch (error) {
//     console.error('Błąd podczas scrapowania ogłoszeń:', error);
//   }
// }

// async function scrapeItemByUrl(pool, item) {
//   console.log(`Rozpoczynam scrapowanie URL: ${item.olx_url}`);
  
//   if (!item.olx_url || !item.olx_url.startsWith('https://www.olx.pl/')) {
//     console.error(`Nieprawidłowy URL dla przedmiotu ${item.name}: ${item.olx_url}`);
//     return;
//   }

//   const url = new URL(item.olx_url);
//   console.log('Parametry URL:', url.search);

//   // Dodaj proxy do opcji - jeśli posiadasz serwer proxy, odkomentuj poniższą linię i ustaw właściwy adres
//   const browser = await puppeteer.launch({ 
//     headless: true,
//     args: [
//       '--no-sandbox',
//       '--disable-setuid-sandbox',
//       // '--proxy-server=http://your-proxy-server:port'
//     ]
//   });
  
//   try {
//     const page = await browser.newPage();
    
//     // Rotacja User-Agent
//     const randomUserAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
//     await page.setUserAgent(randomUserAgent);
    
//     await page.setExtraHTTPHeaders({
//       'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
//       'User-Agent': randomUserAgent,
//       'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
//       'Connection': 'keep-alive',
//       'Cache-Control': 'max-age=0',
//       'Upgrade-Insecure-Requests': '1'
//     });

//     // Losowe opóźnienie, aby symulować zachowanie użytkownika
//     const randomDelay = Math.floor(Math.random() * 3000) + 2000; // 2-5 sekund
//     console.log(`Czekam ${randomDelay}ms przed przejściem do URL...`);
//     await new Promise(resolve => setTimeout(resolve, randomDelay));
    
//     const searchUrl = item.olx_url;
//     console.log(`Scrapowanie: ${searchUrl}`);
//     await canMakeRequest();
// // Załaduj stronę
// await page.goto(searchUrl, { waitUntil: 'networkidle2' });
// console.log(`Strona ${searchUrl} została załadowana.`);

// // Log tytułu strony, aby upewnić się, że strona się załadowała
// const pageTitle = await page.title();
// console.log(`Tytuł strony: ${pageTitle}`);

// // Log fragmentu zawartości HTML (pierwsze 500 znaków)
// const pageContent = await page.content();
// console.log(`Fragment zawartości strony:\n${pageContent.substring(0, 500)}`);

// // Opcjonalnie: zapisz zrzut ekranu do pliku, by wizualnie potwierdzić poprawność strony
// await page.screenshot({ path: `loadedPage-${Date.now()}.png` });
   
//     console.log('Strona załadowana, czekam na elementy...');

//     // Sprawdzenie, czy występuje CAPTCHA lub inne oznaki blokady
//     const hasCaptcha = await page.evaluate(() => {
//       return document.querySelector('.g-recaptcha') !== null || 
//              document.querySelector('[data-sitekey]') !== null ||
//              document.body.textContent.toLowerCase().includes('captcha');
//     });

//     if (hasCaptcha) {
//       console.error('Wykryto CAPTCHA lub blokadę scraper\'a! Sprawdź, czy scraper został zablokowany.');
//       await page.screenshot({ path: `captcha-${Date.now()}.png` });
//       return;
//     } else {
//       console.log('Brak CAPTCHA - scraper działa poprawnie.');
//     }

//     // Sprawdzenie, czy są wyniki wyszukiwania
//     const hasNoResults = await page.evaluate(() => {
//       return document.body.textContent.includes('Nie znaleźliśmy ogłoszeń dla tego zapytania') ||
//              document.querySelector('.emptynew') !== null;
//     });
    
//     if (hasNoResults) {
//       console.log('Brak wyników dla tego wyszukiwania.');
//       return;
//     }
    
//     // Wybór selektora dla ogłoszeń
//     const listingSelectors = [
//       '.css-rc5s2u', 
//       'div[data-cy="l-card"]',
//       '.css-1sw7q4x',
//       '.css-qfzx1y',
//       '.offer-wrapper', 
//       '.listing-grid-container .offer',
//       'div[data-testid="listing-grid"] > div'
//     ];
    
    
    
//     let listingSelector = '.css-qfzx1y';
//     // for (const selector of listingSelectors) {
//     //   if (await page.$(selector) !== null) {
//     //     listingSelector = selector;
//     //     break;
//     //   }
//     // }
    
//     if (!listingSelector) {
//       console.log('Nie znaleziono selektora dla ogłoszeń');
//       return;
//     }
    
//     console.log(`Używam selektora: ${listingSelector}`);
//     await page.waitForSelector(listingSelector, { timeout: 10000 }).catch(() => console.log('Timeout oczekiwania na selektor ogłoszeń'));
    
//     // Pobranie ogłoszeń ze strony
//     const listings = await page.evaluate(() => {
//       const results = [];
//       const selectors = [
//         '.css-qfzx1y'
//       ]
//       // const selectors = [
//       //   '.css-rc5s2u', 
//       //   'div[data-cy="l-card"]',
//       //   '.css-1sw7q4x',
//       //   '.css-qfzx1y',
//       //   '.offer-wrapper', 
//       //   '.listing-grid-container .offer',
//       //   'div[data-testid="listing-grid"] > div'
//       // ];
      
//       let listingElements = [];
//       for (const selector of selectors) {
//         const elements = document.querySelectorAll(selector);
//         if (elements.length > 0) {
//           listingElements = elements;
//           console.log(`Znaleziono elementy używając selektora: ${selector}`);
//           break;
//         }
//       }
      
//       console.log(`Znaleziono ${listingElements.length} elementów ogłoszeń`);
      
//       listingElements.forEach(element => {
//         try {
//           const titleSelectors = ['h6', '.title-cell h3', '.title a', '[data-cy="ad-title"]', '.css-16v5mdi', 'h6[data-testid="ad-title"]'];
//           const priceSelectors = ['.css-10b0gli', '.price', '.price strong', '[data-cy="ad-price"]', '.css-dcwlyx', 'p[data-testid="ad-price"]'];
//           const locationSelectors = ['.css-veheph', '.space-right', '.breadcrumb', '[data-cy="ad-location"]', '.css-1897d50', 'p[data-testid="location-date"]'];
//           const linkSelectors = ['a', '.title a', '[data-cy="listing-link"]', 'a[href*="/d/"]', 'a[data-testid="listing-link"]'];
          
//           let titleElement = null;
//           for (const selector of titleSelectors) {
//             const el = element.querySelector(selector);
//             if (el) {
//               titleElement = el;
//               break;
//             }
//           }
          
//           let priceElement = null;
//           for (const selector of priceSelectors) {
//             const el = element.querySelector(selector);
//             if (el) {
//               priceElement = el;
//               break;
//             }
//           }
          
//           let locationElement = null;
//           for (const selector of locationSelectors) {
//             const el = element.querySelector(selector);
//             if (el) {
//               locationElement = el;
//               break;
//             }
//           }
          
//           let linkElement = null;
//           for (const selector of linkSelectors) {
//             const el = element.querySelector(selector);
//             if (el) {
//               linkElement = el;
//               break;
//             }
//           }
          
//           const imageElement = element.querySelector('img');
          
//           if (titleElement && linkElement) {
//             const title = titleElement.textContent.trim();
//             const url = linkElement.href;
            
//             let price = 0;
//             if (priceElement) {
//               const priceText = priceElement.textContent.trim();
//               const priceMatch = priceText.match(/[\d\s,.]+/);
//               if (priceMatch) {
//                 price = parseFloat(priceMatch[0].replace(/\s/g, '').replace(',', '.'));
//               }
//             }
            
//             const location = locationElement ? locationElement.textContent.trim() : '';
//             const imageUrl = imageElement ? (imageElement.dataset.src || imageElement.src) : '';
            
//             let olxId = '';
//             const idMatch = url.match(/\/(\d+)\/?$/);
//             if (idMatch && idMatch[1]) {
//               olxId = idMatch[1];
//             } else {
//               const urlParts = url.split('/').filter(Boolean);
//               const lastPart = urlParts[urlParts.length - 1];
//               olxId = lastPart.split('.')[0].replace(/[^0-9]/g, '');
//             }
            
//             if (olxId) {
//               results.push({
//                 title,
//                 price,
//                 location,
//                 imageUrl,
//                 url,
//                 olxId
//               });
//             }
//           }
//         } catch (e) {
//           console.error('Błąd podczas parsowania elementu:', e);
//         }
//       });
      
//       return results;
//     });
    
//     console.log(`Pobrano ${listings.length} ogłoszeń z HTML`);
//     if (listings.length > 0) {
//       console.log('Przykładowe ogłoszenie:', JSON.stringify(listings[0]));
//     } else {
//       console.log('Brak ogłoszeń do przetworzenia.');
//     }
    
//     // Przetwarzanie i zapisywanie ogłoszeń
//     for (const listing of listings) {
//       const [existingListing] = await pool.query('SELECT id FROM listings WHERE olx_id = ?', [listing.olxId]);
      
//       if (existingListing.length === 0) {
//         await canMakeRequest();
//         await page.goto(listing.url, { waitUntil: 'networkidle2' });
//         console.log(`Pobrano stronę szczegółów dla ogłoszenia: ${listing.olxId}`);
        
//         const details = await page.evaluate(() => {
//           const descriptionElement = document.querySelector('[data-cy="ad_description"]');
//           const sellerIdElement = document.querySelector('[data-cy="seller-link"]');
//           const conditionElement = document.querySelector('.css-b5m1rv span');
          
//           return {
//             description: descriptionElement ? descriptionElement.textContent.trim() : '',
//             sellerId: sellerIdElement ? sellerIdElement.href.split('/').pop() : '',
//             condition: conditionElement && conditionElement.nextElementSibling && conditionElement.nextElementSibling.textContent.toLowerCase().includes('nowy') ? 'new' : 'used'
//           };
//         });
        
//         const [result] = await pool.query(
//           'INSERT INTO listings (monitored_item_id, olx_id, title, price, location, item_condition, url, image_url, description, seller_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
//           [item.id, listing.olxId, listing.title, listing.price, listing.location, details.condition, listing.url, listing.imageUrl, details.description, details.sellerId]
//         );
        
//         if (result.insertId) {
//           await pool.query(
//             'INSERT INTO price_history (listing_id, price) VALUES (?, ?)',
//             [result.insertId, listing.price]
//           );
          
//           await pool.query(
//             'INSERT INTO notifications (user_id, listing_id, type) VALUES (?, ?, ?)',
//             [item.user_id, result.insertId, 'email']
//           );
//         }
//       } else {
//         const listingId = existingListing[0].id;
//         await pool.query('UPDATE listings SET price = ?, updated_at = NOW() WHERE id = ?', [listing.price, listingId]);
        
//         const [currentPrice] = await pool.query('SELECT price FROM price_history WHERE listing_id = ? ORDER BY date DESC LIMIT 1', [listingId]);
        
//         if (currentPrice.length === 0 || currentPrice[0].price !== listing.price) {
//           await pool.query('INSERT INTO price_history (listing_id, price) VALUES (?, ?)', [listingId, listing.price]);
//         }
//       }
      
//       const delayBetweenListings = 2000 + Math.random() * 3000;
//       console.log(`Opóźnienie ${Math.floor(delayBetweenListings)}ms przed przetwarzaniem kolejnego ogłoszenia...`);
//       await new Promise(resolve => setTimeout(resolve, delayBetweenListings));
//     }
    
//     console.log(`Zakończono scrapowanie dla przedmiotu: ${item.name}`);
//   } catch (error) {
//     console.error(`Błąd podczas scrapowania przedmiotu ${item.name}:`, error);
//   } finally {
//     await browser.close();
//   }
// }

// module.exports = {
//   scrapeListings,
//   scrapeItemByUrl
// };




// const puppeteer = require('puppeteer');

// // Lista User-Agents do rotacji
// const USER_AGENTS = [
//   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
//   'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15',
//   'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
//   'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.101 Safari/537.36'
// ];

// // Konfiguracja limitowania żądań
// const MAX_REQUESTS_PER_MINUTE = 10;
// const requestTimestamps = [];

// // Funkcja do sprawdzania, czy możemy wykonać kolejne żądanie
// async function canMakeRequest() {
//   const now = Date.now();
//   // Usuń stare timestampy (starsze niż minuta)
//   while (requestTimestamps.length > 0 && requestTimestamps[0] < now - 60000) {
//     requestTimestamps.shift();
//   }
  
//   // Sprawdź, czy nie przekroczyliśmy limitu
//   if (requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
//     console.log(`Osiągnięto limit żądań (${MAX_REQUESTS_PER_MINUTE}/min). Czekam...`);
//     // Czekaj, aż będzie można wykonać kolejne żądanie
//     const waitTime = 60000 - (now - requestTimestamps[0]) + 1000; // +1s zapasu
//     await new Promise(resolve => setTimeout(resolve, waitTime));
//     return canMakeRequest(); // Rekurencyjnie sprawdź ponownie
//   }
  
//   // Dodaj aktualny timestamp
//   requestTimestamps.push(now);
//   return true;
// }

// async function scrapeListings(pool) {
//   try {
//     // Pobierz wszystkie monitorowane przedmioty z bazy danych
//     const [items] = await pool.query('SELECT * FROM monitored_items');
    
//     console.log(`Znaleziono ${items.length} przedmiotów do monitorowania`);
    
//     // Dla każdego przedmiotu uruchom scrapowanie
//     for (const item of items) {
//       try {
//         console.log(`Rozpoczynam scrapowanie dla przedmiotu: ${item.name}`);
        
//         // Sprawdź, czy przedmiot ma URL OLX
//         if (item.olx_url && item.olx_url.startsWith('https://www.olx.pl/')) {
//           await scrapeItemByUrl(pool, item);
//         } else {
//           console.log(`Przedmiot ${item.name} nie ma prawidłowego URL OLX`);
//         }
//       } catch (error) {
//         console.error(`Błąd podczas scrapowania przedmiotu ${item.name}:`, error);
//       }
//     }
//   } catch (error) {
//     console.error('Błąd podczas scrapowania ogłoszeń:', error);
//   }
// }

// async function scrapeItemByUrl(pool, item) {
//   console.log(`Rozpoczynam scrapowanie URL: ${item.olx_url}`);
  
//   if (!item.olx_url || !item.olx_url.startsWith('https://www.olx.pl/')) {
//     console.error(`Nieprawidłowy URL dla przedmiotu ${item.name}: ${item.olx_url}`);
//     return;
//   }

//   const url = new URL(item.olx_url);
//   console.log('Parametry URL:', url.search);

//   const browser = await puppeteer.launch({ 
//     headless: true,
//     args: ['--no-sandbox', '--disable-setuid-sandbox']
//   });
  
//   try {
//     const page = await browser.newPage();
    
//     // Rotacja User-Agent
//     const randomUserAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
//     await page.setUserAgent(randomUserAgent);
    
//     await page.setExtraHTTPHeaders({
//       'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
//       'User-Agent': randomUserAgent,
//       'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
//       'Connection': 'keep-alive',
//       'Cache-Control': 'max-age=0',
//       'Upgrade-Insecure-Requests': '1'
//     });

//     // Dodaj losowe opóźnienie przed przejściem do URL
//     const randomDelay = Math.floor(Math.random() * 3000) + 2000; // 2-5 sekund
//     await new Promise(resolve => setTimeout(resolve, randomDelay));
//     console.log(`Czekam ${randomDelay}ms przed przejściem do URL...`);
    
//     // Użyj URL z bazy danych
//     const searchUrl = item.olx_url;
    
//     console.log(`Scrapowanie: ${searchUrl}`);
//     await canMakeRequest();
//     await page.goto(searchUrl, { waitUntil: 'networkidle2' });
//     console.log('Strona załadowana, czekam na elementy...');

//     // Sprawdź, czy jest captcha
//     const hasCaptcha = await page.evaluate(() => {
//       return document.querySelector('.g-recaptcha') !== null || 
//              document.querySelector('[data-sitekey]') !== null ||
//              document.body.textContent.includes('captcha');
//     });

//     if (hasCaptcha) {
//       console.error('Wykryto captcha! Nie można kontynuować scrapowania.');
//       await page.screenshot({ path: `captcha-${Date.now()}.png` });
//       return;
//     }

//     // Sprawdź, czy są wyniki wyszukiwania
//     const hasNoResults = await page.evaluate(() => {
//       return document.body.textContent.includes('Nie znaleźliśmy ogłoszeń dla tego zapytania') ||
//              document.querySelector('.emptynew') !== null;
//     });

//     if (hasNoResults) {
//       console.log('Brak wyników dla tego wyszukiwania.');
//       return;
//     }
    
//     // Czekaj na załadowanie wyników
//     const listingSelectors = [
//       '.css-rc5s2u', 
//       'div[data-cy="l-card"]',
//       '.css-1sw7q4x',
//       '.offer-wrapper', 
//       '.listing-grid-container .offer',
//       'div[data-testid="listing-grid"] > div'
//     ];
    
//     let listingSelector = '';
//     for (const selector of listingSelectors) {
//       if (await page.$(selector) !== null) {
//         listingSelector = selector;
//         break;
//       }
//     }
    
//     if (!listingSelector) {
//       console.log('Nie znaleziono selektora dla ogłoszeń');
//       return;
//     }
    
//     console.log(`Używam selektora: ${listingSelector}`);
//     await page.waitForSelector(listingSelector, { timeout: 10000 }).catch(() => console.log('Timeout waiting for listings'));
    
//     // Pobierz wszystkie ogłoszenia ze strony
//     const listings = await page.evaluate(() => {
//       const results = [];
      
//       // Próba różnych selektorów dla listy ogłoszeń
//       const selectors = [
//         '.css-rc5s2u', 
//         'div[data-cy="l-card"]',
//         '.css-1sw7q4x',
//         '.offer-wrapper',
//         'div[data-testid="listing-grid"] > div'
//       ];
      
//       let listingElements = [];
//       for (const selector of selectors) {
//         const elements = document.querySelectorAll(selector);
//         if (elements.length > 0) {
//           listingElements = elements;
//           console.log(`Znaleziono elementy używając selektora: ${selector}`);
//           break;
//         }
//       }
      
//       console.log(`Znaleziono ${listingElements.length} elementów ogłoszeń`);
      
//       listingElements.forEach(element => {
//         try {
//           // Różne selektory dla różnych wersji OLX
//           const titleSelectors = ['h6', '.title-cell h3', '.title a', '[data-cy="ad-title"]', '.css-16v5mdi', 'h6[data-testid="ad-title"]'];
//           const priceSelectors = ['.css-10b0gli', '.price', '.price strong', '[data-cy="ad-price"]', '.css-dcwlyx', 'p[data-testid="ad-price"]'];
//           const locationSelectors = ['.css-veheph', '.space-right', '.breadcrumb', '[data-cy="ad-location"]', '.css-1897d50', 'p[data-testid="location-date"]'];
//           const linkSelectors = ['a', '.title a', '[data-cy="listing-link"]', 'a[href*="/d/"]', 'a[data-testid="listing-link"]'];
          
//           let titleElement = null;
//           for (const selector of titleSelectors) {
//             const el = element.querySelector(selector);
//             if (el) {
//               titleElement = el;
//               break;
//             }
//           }
          
//           let priceElement = null;
//           for (const selector of priceSelectors) {
//             const el = element.querySelector(selector);
//             if (el) {
//               priceElement = el;
//               break;
//             }
//           }
          
//           let locationElement = null;
//           for (const selector of locationSelectors) {
//             const el = element.querySelector(selector);
//             if (el) {
//               locationElement = el;
//               break;
//             }
//           }
          
//           let linkElement = null;
//           for (const selector of linkSelectors) {
//             const el = element.querySelector(selector);
//             if (el) {
//               linkElement = el;
//               break;
//             }
//           }
          
//           const imageElement = element.querySelector('img');
          
//           if (titleElement && linkElement) {
//             const title = titleElement.textContent.trim();
//             const url = linkElement.href;
            
//             // Parsowanie ceny - obsługa różnych formatów
//             let price = 0;
//             if (priceElement) {
//               const priceText = priceElement.textContent.trim();
//               // Usuń wszystkie znaki poza cyframi i przecinkiem/kropką
//               const priceMatch = priceText.match(/[\d\s,.]+/);
//               if (priceMatch) {
//                 // Usuń spacje, zamień przecinek na kropkę i konwertuj na liczbę
//                 price = parseFloat(priceMatch[0].replace(/\s/g, '').replace(',', '.'));
//               }
//             }
            
//             const location = locationElement ? locationElement.textContent.trim() : '';
//             const imageUrl = imageElement ? (imageElement.dataset.src || imageElement.src) : '';
            
//             // Wyciągnij ID ogłoszenia z URL
//             let olxId = '';
//             const idMatch = url.match(/\/(\d+)\/?$/);
//             if (idMatch && idMatch[1]) {
//               olxId = idMatch[1];
//             } else {
//               // Alternatywna metoda - wyciągnij ostatnią część URL
//               const urlParts = url.split('/').filter(Boolean);
//               const lastPart = urlParts[urlParts.length - 1];
//               olxId = lastPart.split('.')[0].replace(/[^0-9]/g, '');
//             }
            
//             if (olxId) {
//               results.push({
//                 title,
//                 price,
//                 location,
//                 imageUrl,
//                 url,
//                 olxId
//               });
//             }
//           }
//         } catch (e) {
//           console.error('Błąd podczas parsowania elementu:', e);
//         }
//       });
      
//       return results;
//     });
    
//     console.log(`Pobrano ${listings.length} ogłoszeń z HTML`);
//     console.log('Przykładowe ogłoszenie:', listings.length > 0 ? JSON.stringify(listings[0]) : 'Brak ogłoszeń');
    
//     // Przetwarzanie i zapisywanie ogłoszeń
//     for (const listing of listings) {
//       // Sprawdź, czy ogłoszenie już istnieje
//       const [existingListing] = await pool.query('SELECT id FROM listings WHERE olx_id = ?', [listing.olxId]);
      
//       if (existingListing.length === 0) {
//         // Pobierz szczegóły ogłoszenia
//         await canMakeRequest();
//         await page.goto(listing.url, { waitUntil: 'networkidle2' });
        
//         const details = await page.evaluate(() => {
//           const descriptionElement = document.querySelector('[data-cy="ad_description"]');
//           const sellerIdElement = document.querySelector('[data-cy="seller-link"]');
//           const conditionElement = document.querySelector('.css-b5m1rv span:contains("Stan:")');
          
//           return {
//             description: descriptionElement ? descriptionElement.textContent.trim() : '',
//             sellerId: sellerIdElement ? sellerIdElement.href.split('/').pop() : '',
//             condition: conditionElement ? (conditionElement.nextElementSibling.textContent.toLowerCase().includes('nowy') ? 'new' : 'used') : 'used'
//           };
//         });
        
//         // Zapisz ogłoszenie do bazy danych
//         const [result] = await pool.query(
//           'INSERT INTO listings (monitored_item_id, olx_id, title, price, location, item_condition, url, image_url, description, seller_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
//           [item.id, listing.olxId, listing.title, listing.price, listing.location, details.condition, listing.url, listing.imageUrl, details.description, details.sellerId]
//         );
        
//         // Zapisz historię cen
//         if (result.insertId) {
//           await pool.query(
//             'INSERT INTO price_history (listing_id, price) VALUES (?, ?)',
//             [result.insertId, listing.price]
//           );
          
//           // Utwórz powiadomienie dla użytkownika
//           await pool.query(
//             'INSERT INTO notifications (user_id, listing_id, type) VALUES (?, ?, ?)',
//             [item.user_id, result.insertId, 'email']
//           );
//         }
//     } else {
//         // Aktualizuj cenę, jeśli ogłoszenie już istnieje
//         const listingId = existingListing[0].id;
//         await pool.query('UPDATE listings SET price = ?, updated_at = NOW() WHERE id = ?', [listing.price, listingId]);
        
//         // Dodaj nowy wpis do historii cen, jeśli cena się zmieniła
//         const [currentPrice] = await pool.query('SELECT price FROM price_history WHERE listing_id = ? ORDER BY date DESC LIMIT 1', [listingId]);
        
//         if (currentPrice.length === 0 || currentPrice[0].price !== listing.price) {
//           await pool.query('INSERT INTO price_history (listing_id, price) VALUES (?, ?)', [listingId, listing.price]);
//         }
//       }
      
//       // Opóźnienie między przetwarzaniem ogłoszeń
//       await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
//     }
    
//     console.log(`Zakończono scrapowanie dla przedmiotu: ${item.name}`);
//   } catch (error) {
//     console.error(`Błąd podczas scrapowania przedmiotu ${item.name}:`, error);
//   } finally {
//     await browser.close();
//   }
// }

// // Eksportuj funkcje
// module.exports = {
//   scrapeListings,
//   scrapeItemByUrl
// };










// // services/scraperService.js
// const puppeteer = require('puppeteer');
// const { v4: uuidv4 } = require('uuid');
// const aiService = require('./aiService');

// const USER_AGENTS = [
//   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
//   'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
//   'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36'
// ];


// const MAX_REQUESTS_PER_MINUTE = 10;
// const requestTimestamps = [];

// // Funkcja do sprawdzania, czy możemy wykonać kolejne żądanie
// async function canMakeRequest() {
//   const now = Date.now();
//   // Usuń stare timestampy (starsze niż minuta)
//   while (requestTimestamps.length > 0 && requestTimestamps[0] < now - 60000) {
//     requestTimestamps.shift();
//   }
  
//   // Sprawdź, czy nie przekroczyliśmy limitu
//   if (requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
//     console.log(`Osiągnięto limit żądań (${MAX_REQUESTS_PER_MINUTE}/min). Czekam...`);
//     // Czekaj, aż będzie można wykonać kolejne żądanie
//     const waitTime = 60000 - (now - requestTimestamps[0]) + 1000; // +1s zapasu
//     await new Promise(resolve => setTimeout(resolve, waitTime));
//     return canMakeRequest(); // Rekurencyjnie sprawdź ponownie
//   }
  
//   // Dodaj aktualny timestamp
//   requestTimestamps.push(now);
//   return true;
// }

// async function scrapeListings(pool) {
//   try {
//     // Pobierz wszystkie monitorowane przedmioty
//     const [items] = await pool.query('SELECT * FROM monitored_items');
    
//     for (const item of items) {
//       await scrapeItemListings(pool, item);
//       // Opóźnienie między scrapowaniem różnych przedmiotów, aby uniknąć blokady
//       await new Promise(resolve => setTimeout(resolve, 5000 + Math.random() * 5000));
//     }
//   } catch (error) {
//     console.error('Błąd podczas scrapowania:', error);
//   }
// }

// async function scrapeListings(pool) {
//     try {
//       // Pobierz wszystkie monitorowane przedmioty z bazy danych
//       const [items] = await pool.query('SELECT * FROM monitored_items');
      
//       console.log(`Znaleziono ${items.length} przedmiotów do monitorowania`);
      
//       // Dla każdego przedmiotu uruchom scrapowanie
//       for (const item of items) {
//         try {
//           console.log(`Rozpoczynam scrapowanie dla przedmiotu: ${item.name}`);
          
//           // Sprawdź, czy przedmiot ma URL OLX
//           if (item.olx_url && item.olx_url.startsWith('https://www.olx.pl/')) {
//             await scrapeItemByUrl(pool, item);
//           } else {
//             console.log(`Przedmiot ${item.name} nie ma prawidłowego URL OLX`);
//           }
//         } catch (error) {
//           console.error(`Błąd podczas scrapowania przedmiotu ${item.name}:`, error);
//         }
//       }
//     } catch (error) {
//       console.error('Błąd podczas scrapowania ogłoszeń:', error);
//     }
//   }
  
//   // Nowa funkcja do scrapowania na podstawie URL
//   async function scrapeItemByUrl(pool, item) {
//     const browser = await puppeteer.launch({ 
//       headless: true,
//       args: ['--no-sandbox', '--disable-setuid-sandbox']
//     });
    
//     try {
//       const page = await browser.newPage();
      
//       // Rotacja User-Agent
//       const randomUserAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
//       await page.setUserAgent(randomUserAgent);
      
//       // Użyj URL z bazy danych
//       const searchUrl = item.olx_url;
      
//       console.log(`Scrapowanie: ${searchUrl}`);
//       await canMakeRequest();
//       await page.goto(searchUrl, { waitUntil: 'networkidle2' });
      
//       // Czekaj na załadowanie wyników
//       const listingSelectors = [
//         '.css-rc5s2u', 
//         'div[data-cy="l-card"]', 
//         '.offer-wrapper', 
//         '.listing-grid-container .offer'
//       ];
      
//       let listingSelector = '';
//       for (const selector of listingSelectors) {
//         if (await page.$(selector) !== null) {
//           listingSelector = selector;
//           break;
//         }
//       }
      
//       if (!listingSelector) {
//         console.log('Nie znaleziono selektora dla ogłoszeń');
//         return;
//       }
      
//       await page.waitForSelector(listingSelector, { timeout: 10000 }).catch(() => console.log('Timeout waiting for listings'));
      
//       // Pobierz wszystkie ogłoszenia ze strony
//       const listings = await page.evaluate((selector) => {
//         const results = [];
//         const listingElements = document.querySelectorAll(selector);
        
//         listingElements.forEach(element => {
//           try {
//             const titleElement = element.querySelector('h6, .title-cell h3, .title a, [data-cy="ad-title"]');
//             const priceElement = element.querySelector('.css-10b0gli, .price, .price strong, [data-cy="ad-price"]');
//             const locationElement = element.querySelector('.css-veheph, .space-right, .breadcrumb, [data-cy="ad-location"]');
//             const imageElement = element.querySelector('img');
//             const linkElement = element.querySelector('a, .title a, [data-cy="listing-link"]');
            
//             if (titleElement && priceElement && linkElement) {
//               const title = titleElement.textContent.trim();
//               const priceText = priceElement.textContent.trim();
//               const price = parseFloat(priceText.replace(/[^\d,]/g, '').replace(',', '.'));
//               const location = locationElement ? locationElement.textContent.trim() : '';
//               const imageUrl = imageElement ? (imageElement.dataset.src || imageElement.src) : '';
//               const url = linkElement.href;
//               const olxId = url.split('/').pop().split('.')[0].replace(/[^0-9]/g, '');
              
//               results.push({
//                 title,
//                 price,
//                 location,
//                 imageUrl,
//                 url,
//                 olxId
//               });
//             }
//           } catch (e) {
//             console.error('Błąd podczas parsowania elementu:', e);
//           }
//         });
        
//         return results;
//       }, listingSelector);
      
//       console.log(`Znaleziono ${listings.length} ogłoszeń dla "${item.name}"`);
      
//       // Przetwarzanie i zapisywanie ogłoszeń (pozostała część kodu bez zmian)
//       // ...
      
//     } catch (error) {
//       console.error(`Błąd podczas scrapowania przedmiotu ${item.name}:`, error);
//     } finally {
//       await browser.close();
//     }
//   }
  
// module.exports = {
//   scrapeListings
// };
