# Poprawki indeksowania GSC — 8 października 2026

Poprawki przygotowano w sześciu lokalnych repozytoriach. Nie zmieniono tekstów,
tłumaczeń ani stylów widocznych stron. Wdrożenie produkcyjne i ponowne
przetworzenie adresów przez Google są osobnymi krokami.

| Projekt | Zmiana | Oczekiwany wynik po wdrożeniu |
| --- | --- | --- |
| `moja_strona` | Generowanie 404 z istniejącą aplikacją; usuwanie canonical na nieznanej trasie; usunięcie sztucznego lastmod; kontrola SEO przy buildzie | Nieznana trasa zachowuje URL i HTTP 404; siedem właściwych tras ma zgodne canonical i mapy |
| `tomi-forno/frontend` | Jedna baza URL, normalizacja starego aliasu Vercel, poprawka ukośnika, robots i sitemap, przekierowanie aliasu | `/pl` i `/en` mają canonical na `tomi-forno.shellty.pl`; pliki SEO zwracają poprawne formaty |
| `shellty-prompt-coach/frontend` | noindex aplikacji i ekranów logowania, bez canonical do korzenia; indeksowalna polityka prywatności; uporządkowana mapa | Logowanie pozostaje poza indeksem; mapa zawiera tylko stronę polityki prywatności |
| `shellty-cms` | Dokładne aliasy starych tras wyłącznie dla hosta demo; deduplikacja i respektowanie noIndex w mapie | Cztery stare adresy przekierowują 308 do właściwych tras; mapa nie zawiera duplikatów ani wykluczonych sekcji |
| `NerdsFamily/Shellty_Blog` | Canonical domeny publicznej, robots, dynamiczna mapa wpisów, przekierowanie aliasu Render, noindex tras prywatnych, status 404 nieistniejącego wpisu | Publiczny blog dostępny dla robotów; mapa obejmuje istniejące wpisy; treść widoków bez zmian |
| `NerdsFamily/KanbanApp_Project` | noindex aplikacji wymagającej logowania; prawdziwy robots; wyjątki od fallbacku SPA | `/robots.txt` jest tekstem; brak mapy indeksowalnych stron zwraca 404; formularze działają jak wcześniej |

## Walidacja wykonana lokalnie

- Produkcyjne buildy głównej strony, Tomi Forno, Prompt Coach i CMS oraz build Vite Kanbana.
- 18 testów jednostkowych Tomi Forno, 36 CMS, 15 Kanbana i 14 bloga.
- Po trzy testy SEO w przeglądarce dla Tomi Forno i Prompt Coach.
- Lint i TypeScript Tomi Forno i Prompt Coach; lint zmienionych plików i TypeScript CMS.
- HTTP: cztery dokładne przekierowania CMS zwracają 308.
- Główna strona: identyczny widoczny tekst przed i po w 16 kombinacjach tras i języków; poprawny status i metadane 404.
- Niezmieniony kod body bloga, layoutów React i dokumentu HTML Kanbana.

Build CMS wykonano z bazą zastępczą jak w CI, bez zapisu do produkcyjnej bazy.
Build Tomi Forno korzystał z istniejących danych zapasowych przy niedostępnym
lokalnym Strapi. Test SEO powtórzono z historyczną konfiguracją adresu Vercel,
potwierdzając poprawne adresy domeny publicznej.

## Publikacja i kontrola produkcji

1. Opublikować przygotowane zmiany przez istniejące procesy GitHub Pages,
   Vercel i Render. Nie uruchamiać seedów, resetów ani edycji treści CMS.
2. Na Vercel dla Tomi Forno docelowo ustawić
   `NEXT_PUBLIC_SITE_URL=https://tomi-forno.shellty.pl`. Kod obsługuje również
   wcześniejszą wartość `https://tomi-forno.vercel.app`.
3. Sprawdzić metodą GET statusy, Location, canonical, meta robots i typy
   odpowiedzi robots/sitemap na domenach produkcyjnych.
4. Potwierdzić, że hosting Kanbana respektuje wyjątki w konfiguracji rewrites:
   robots to 200 text/plain, nieistniejąca sitemap to 404.
5. Sprawdzić działanie logowania, koszyka, formularzy oraz kontrolę zdrowia Render.
6. W GSC uruchomić test aktualnego URL i walidację rzeczywiście naprawionych
   zgłoszeń; zgłosić mapy głównej strony, bloga, Tomi Forno i CMS.

Nie usuwać prawidłowego noindex z koszyka CMS, logowania i prywatnych stron.
Adres `/&` CMS jest nieistniejącą trasą i pozostaje wykluczony; nie przekierowuje
do niezwiązanej treści. Kategoria duplikatów z sześciu zrzutów miała już zero URL.
Stan raportów GSC zmieni się dopiero po ponownym skanowaniu; lokalne testy nie
potwierdzają indeksacji przez Google.
