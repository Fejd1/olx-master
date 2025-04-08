// backend/services/aiService.js
// Zastąp całą zawartość pliku poniższym kodem

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Klucz API dla Hugging Face (w produkcji powinien być w zmiennych środowiskowych)
const HF_API_KEY = process.env.HUGGING_FACE_API_KEY;

// Analiza sentymentu tekstu przy użyciu API Hugging Face
async function analyzeSentiment(text) {
  try {
    if (!HF_API_KEY) {
      console.warn('Brak klucza API Hugging Face. Używam domyślnej analizy.');
      return { label: 'NEUTRAL', score: 0.5 };
    }

    const response = await fetch(
      "https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english",
      {
        headers: { Authorization: `Bearer ${HF_API_KEY}` },
        method: "POST",
        body: JSON.stringify({ inputs: text }),
        timeout: 5000 // Timeout po 5 sekundach
      }
    );
    
    if (!response.ok) {
      throw new Error(`API response: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Sprawdź format odpowiedzi
    if (Array.isArray(result) && result.length > 0 && result[0][0]) {
      return result[0][0]; // Format: [[{label, score}]]
    } else if (Array.isArray(result) && result.length > 0) {
      return result[0]; // Format: [{label, score}]
    } else {
      console.warn('Nieoczekiwany format odpowiedzi API:', result);
      return { label: 'NEUTRAL', score: 0.5 };
    }
  } catch (error) {
    console.error('Błąd podczas analizy sentymentu:', error);
    // W przypadku błędu zwróć neutralny wynik
    return { label: 'NEUTRAL', score: 0.5 };
  }
}

// Sprawdzanie autentyczności ogłoszenia
async function checkAuthenticity(title, description) {
  try {
    // Połącz tytuł i opis do analizy
    const text = `${title} ${description || ''}`;
    
    // Wykrywanie potencjalnych oszustw lub fałszywych ogłoszeń
    const redFlags = [
      'super okazja', 'nie przegap', 'ostatnia sztuka', 'pilne', 
      'niesamowita oferta', 'kontakt tylko przez email', 'wysyłka za granicę',
      'przedpłata', 'western union', 'money gram'
    ];
    
    // Oblicz liczbę wykrytych red flags
    const redFlagCount = redFlags.reduce((count, flag) => {
      return count + (text.toLowerCase().includes(flag.toLowerCase()) ? 1 : 0);
    }, 0);
    
    // Analiza sentymentu tekstu
    const sentiment = await analyzeSentiment(text);
    
    // Oblicz wynik autentyczności (0-1)
    // Wyższy wynik dla pozytywnego sentymentu, niższy dla większej liczby red flags
    const sentimentScore = sentiment.label === 'POSITIVE' ? sentiment.score : 1 - sentiment.score;
    const redFlagScore = Math.max(0, 1 - (redFlagCount * 0.2));
    
    // Wynik końcowy to średnia ważona
    const authenticityScore = (sentimentScore * 0.3) + (redFlagScore * 0.7);
    
    return Math.min(1, Math.max(0, authenticityScore));
  } catch (error) {
    console.error('Błąd podczas analizy autentyczności:', error);
    // W przypadku błędu zwróć neutralny wynik
    return 0.5;
  }
}
// Obliczanie potencjału zysku
async function calculateProfitPotential(itemName, currentPrice) {
    try {
      // Pobierz średnią cenę rynkową dla danego przedmiotu
      const marketPrice = await getMarketPrice(itemName);
      
      if (!marketPrice) return 0;
      
      // Oblicz potencjalny zysk jako różnicę procentową
      const potentialProfit = ((marketPrice - currentPrice) / currentPrice) * 100;
      
      return Math.max(0, potentialProfit);
    } catch (error) {
      console.error('Błąd podczas obliczania potencjału zysku:', error);
      return 0;
    }
  }
  
  // Pobieranie średniej ceny rynkowej (symulacja - w rzeczywistości można użyć API cenowego)
  async function getMarketPrice(itemName) {
    // Przykładowe ceny dla popularnych produktów
    const marketPrices = {
      'iphone 12': 2500,
      'iphone 13': 3500,
      'iphone 14': 4500,
      'samsung s21': 2800,
      'samsung s22': 3800,
      'samsung s23': 4800,
      'macbook air': 5000,
      'macbook pro': 7000,
      'playstation 5': 2400,
      'xbox series x': 2300,
      'nintendo switch': 1200,
      'rtx 3060': 1800,
      'rtx 3070': 2500,
      'rtx 3080': 3500,
      'rtx 4070': 3200,
      'rtx 4080': 4800
    };
    
    // Znajdź najlepsze dopasowanie dla nazwy przedmiotu
    const itemNameLower = itemName.toLowerCase();
    let bestMatch = null;
    let bestMatchScore = 0;
    
    for (const [product, price] of Object.entries(marketPrices)) {
      // Proste dopasowanie na podstawie zawierania słów kluczowych
      if (itemNameLower.includes(product)) {
        const matchScore = product.length / itemNameLower.length;
        if (matchScore > bestMatchScore) {
          bestMatch = product;
          bestMatchScore = matchScore;
        }
      }
    }
    
    // Jeśli znaleziono dopasowanie, zwróć cenę rynkową
    if (bestMatch && bestMatchScore > 0.3) {
      return marketPrices[bestMatch];
    }
    
    // W przeciwnym razie spróbuj oszacować cenę na podstawie podobnych produktów
    return estimatePrice(itemNameLower, marketPrices);
  }
  
  // Oszacowanie ceny na podstawie podobnych produktów
  function estimatePrice(itemName, marketPrices) {
    // Rozpoznawanie kategorii produktu
    const categories = {
      'phone': ['iphone', 'samsung', 'xiaomi', 'huawei', 'oppo', 'realme', 'telefon', 'smartfon'],
      'laptop': ['macbook', 'laptop', 'notebook', 'ultrabook', 'dell', 'hp', 'lenovo', 'asus'],
      'console': ['playstation', 'xbox', 'nintendo', 'konsola'],
      'gpu': ['rtx', 'gtx', 'radeon', 'karta graficzna']
    };
    
    let category = null;
    for (const [cat, keywords] of Object.entries(categories)) {
      for (const keyword of keywords) {
        if (itemName.includes(keyword)) {
          category = cat;
          break;
        }
      }
      if (category) break;
    }
    
    if (!category) return null;
    
    // Oblicz średnią cenę dla kategorii
    let sum = 0;
    let count = 0;
    
    for (const [product, price] of Object.entries(marketPrices)) {
      for (const keyword of categories[category]) {
        if (product.includes(keyword)) {
          sum += price;
          count++;
          break;
        }
      }
    }
    
    return count > 0 ? sum / count : null;
  }
  
  // Weryfikacja czy przedmiot w ogłoszeniu jest faktycznie poszukiwanym produktem
  async function verifyProductMatch(searchTerm, listingTitle, listingDescription) {
    try {
      const searchTermLower = searchTerm.toLowerCase();
      const titleLower = listingTitle.toLowerCase();
      const descriptionLower = listingDescription.toLowerCase();
      
      // Proste dopasowanie na podstawie zawierania słów kluczowych
      const containsInTitle = titleLower.includes(searchTermLower);
      const containsInDescription = descriptionLower.includes(searchTermLower);
      
      // Jeśli szukany termin nie występuje ani w tytule, ani w opisie, zwróć niski wynik
      if (!containsInTitle && !containsInDescription) {
        return 0.1;
      }
      
      // Sprawdź, czy ogłoszenie zawiera słowa kluczowe związane z produktem
      const keywords = searchTermLower.split(' ');
      let keywordMatchCount = 0;
      
      for (const keyword of keywords) {
        if (keyword.length > 2 && (titleLower.includes(keyword) || descriptionLower.includes(keyword))) {
          keywordMatchCount++;
        }
      }
      
      const keywordMatchScore = keywords.length > 0 ? keywordMatchCount / keywords.length : 0;
      
      // Analiza kontekstu przy użyciu prostej heurystyki
      const contextScore = analyzeContext(searchTerm, listingTitle, listingDescription);
      
      // Wynik końcowy to średnia ważona
      return (containsInTitle ? 0.4 : 0) + (keywordMatchScore * 0.3) + (contextScore * 0.3);
    } catch (error) {
      console.error('Błąd podczas weryfikacji dopasowania produktu:', error);
      return 0.5;
    }
  }
  
  // Analiza kontekstu przy użyciu prostej heurystyki
  function analyzeContext(searchTerm, listingTitle, listingDescription) {
    const text = `${listingTitle} ${listingDescription}`;
    const searchTermWords = searchTerm.toLowerCase().split(' ');
    
    // Sprawdź, czy tekst zawiera wszystkie słowa z szukanego terminu
    const allWordsPresent = searchTermWords.every(word => 
      word.length > 2 && text.toLowerCase().includes(word)
    );
    
    // Sprawdź, czy tekst zawiera frazy, które mogą wskazywać na nieprawidłowe dopasowanie
    const negativeIndicators = [
      'nie jest', 'to nie', 'podobny do', 'zamiennik', 'alternatywa',
      'podróbka', 'replika', 'klon', 'kompatybilny z'
    ];
    
    const hasNegativeIndicators = negativeIndicators.some(indicator => 
      text.toLowerCase().includes(indicator)
    );
    
    return allWordsPresent && !hasNegativeIndicators ? 0.9 : 0.3;
  }

module.exports = {
  checkAuthenticity,
  calculateProfitPotential,
  verifyProductMatch
};