# Audyt UX i generycznego wyglądu: `lekcja-06/02-rekrutacja.html` (TalentHub)

Pliku projektu nie zmieniałem. Pomiary zrobiłem w headless Chrome przy 1440, 768 i 320 px, z przywróconą widocznością `.reveal`.

Kontrasty zmierzyłem programowo, tylko tam, gdzie tło jest jednolite. Dla gradientów to szacunek, nie pomiar.

## Krok 1. Znaki generycznego wyglądu

| Znak | Status | Gdzie |
|---|---|---|
| Indygo jako akcja | występuje | `--primary:#4f46e5` (l.19), `.btn-primary`, aktywna zakładka, plan wyróżniony |
| Gradient w tekście nagłówka | występuje | `.gradient-text` l.186, h1 l.885; też liczby `.stat-box strong` l.414 |
| Gradient w tle lub na przycisku | występuje | logo l.103, hero l.134, słupki l.653, CTA l.724 (indygo → fiolet → cyjan z kropkami) |
| Ciemnogranatowe tło z poświatą | częściowo | stopka `#0f172a` bez poświaty; w hero jest jasna poświata cyjanowa (l.145) |
| Duże zaokrąglenia i pigułki | występuje | `999px` w 7 miejscach (badge, tagi, chipy, match, plan-badge), 10–24 px na kartach |
| Karty z cieniem jako jedyny podział | częściowo | karty mają ramkę 1 px, cień `--shadow-lg` pojawia się na hover i na elementach hero |
| Karta w karcie | występuje | hero: `.float-card` z kandydatami; panel `.dashboard` z `.kpi` w środku |
| Rozmyte panele | występuje | nagłówek `backdrop-filter: blur(12px)` (l.82) |
| Pigułka z nowością nad nagłówkiem | występuje | `.badge` „Ponad 12 000 aktywnych ofert pracy” z pulsującą kropką |
| Wyróżnione kolorem słowo w nagłówku | występuje | „naprawdę Ci pasuje” w h1 |
| Para przycisków „główny + drugi” | występuje | „Utwórz darmowe konto” + „Jestem pracodawcą”; „Wybierz plan” + „Rozpocznij 14-dniowy okres próbny” |
| Rząd wielkich liczb | występuje | `.stats-grid`, 4 × 44 px: 12 000+, 850 000+, 3 500+, 14 dni |
| Trzy identyczne karty z ikoną | występuje | `.steps` (×2 zakładki), 3 opinie, 3 plany; osiem kategorii z ikonami to ten sam wzorzec |
| Karty unoszące się nad pierwszym ekranem | występuje | `.float-card` (notif, stat) z animacją `float` |
| Logo jako kolorowy kwadrat | występuje | `.logo-icon`: gradient i ikona „ludzie” |
| Awatary z inicjałami | występuje | hero (4), opinie (3), loga firm (BK, BW…) |
| Emoji zamiast ikon | nie występuje | używane są SVG; gwiazdki ★ to znaki tekstowe |
| Iskierki AI | nie występuje jako ikona | „AI” pada tylko w tekście (l.1000, 1012, 1248, 1306, 1352) |
| Ikony na kolorowym tle przy nagłówkach | występuje | `.category-icon` (8 różnych pastelowych tonów), `.feature-icon`, `.step-num`, `.stat-icon` |
| Puste obietnice | występuje | „Znajdź pracę, która naprawdę Ci pasuje”, „Rekrutuj mądrzej, nie ciężej”, „Inteligentne dopasowanie”, „Najlepsi pracodawcy”, „Idealne dopasowanie” |
| Wymyślone liczby, opinie, klienci | występuje | brak danych produktu. Są 3 opinie ★★★★★ z imionami, „TechNova”, 6 zmyślonych firm, 98% dopasowania. Autor sam zaznaczył w komentarzu l.2, że są zmyślone |

### Spójność liczb

- **Kategorie.** Ich suma to 3 248 + 862 + 1 954 + 1 127 + 743 + 1 381 + 598 + 1 402 = 11 315. Badge i statystyka mówią „12 000”, więc rozbieżność wynosi 685. Jeśli to przybliżenie, powinno być zapisane jako przybliżenie.
- **Lejek rekrutacyjny.** Karta KPI mówi „Rozmowy 96”, a w lejku „Rozmowa HR” to 158 i „Rozmowa tech.” to 96, więc nie wiadomo, co jest rozmowami.
- **Słupki lejka.** Szerokość słupka „Oferta” wynosi 9%, a 31 / 1284 to 2,4%. „Zatrudnieni” mają 6%, a 23 / 1284 to 1,8%. Szerokość nie odpowiada wartościom.
- **Licznik.** Pole „12 000” zaczyna od „0” i animuje się do 12 000+, a w badge liczba jest statyczna.
- **Hero.** „+2 345 nowych aplikacji dziś” nie ma pokrycia w danych. „Wieża Kodu” w powiadomieniu nie występuje nigdzie indziej.

## Krok 2. Błędy UX i dostępności

- **Kontrast** (zmierzony na jednolitych tłach; wymagane 4,5 : 1 dla tekstu, 3 : 1 dla dużego):
  - Gwiazdki `#f59e0b` na bieli: 2,15.
  - Loga firm `#9ca3af` na bieli, 22 px / 800: 2,54.
  - Procent dopasowania `#10b981` na `#ecfdf5`, 13 px: 2,41.
  - KPI `+18%` na szarym tle: 2,43.
  - Chip „UoP” `#059669` na `#ecfdf5`: 3,58.
  - Stopka `#64748b` na `#0f172a`: 3,75.
  - Inicjały (białe) na tle `#06b6d4`: 2,43; `#f59e0b`: 2,15; `#ff5a00`: 3,13; `#16a34a`: 3,30; `#ec4899`: 3,53; `#6366f1`: 4,47.
  - CTA na gradiencie: biały tekst na `#4f46e5` ma ok. 6,3, ale na cyjanie `#06b6d4` ok. 2,4. Przycisk „Jestem pracodawcą” i jego ramka leżą w prawej połowie, gdzie tło zbliża się do cyjanu. To szacunek, nie pomiar.
  - Tekst muted `#6b7280` na bieli ma ok. 4,8 (przechodzi), ale na `#f9fafb` jest ok. 4,6, czyli na granicy.
- **Cele dotykowe.** 17 linków (nawigacja, stopka) ma wysokość 19 px. Spełniają wyjątek odstępu z WCAG 2.5.8: koła o średnicy 24 px wokół ich środków się nie nakładają. Przycisk „zapisz ofertę” (36 × 36 px) jest w normie.
- **Fokus.** Pole wyszukiwania ma `outline: none` (l.222) bez zamiennika. W stopce pole e-mail ma tylko zmianę koloru ramki (l.777). Pozostałe elementy mają domyślny fokus przeglądarki. Tagi „Popularne” i karty kategorii to `<span>` / `<div>` z `cursor:pointer` i `tabIndex -1`: klawiaturą nie da się ich użyć.
- **Etykiety.** Trzy pola nie mają `<label>`: stanowisko, miasto i e-mail w stopce. Tylko placeholder.
- **Kolor jako jedyny nośnik.** Wzrost `+18%` to samo zielone, bez strzałki ani znaku. Tryb pracy i poziom stanowiska w chipach mają też tekst, więc to jest OK.
- **Stany.** Brak stanu ładowania, braku wyników i błędu. Formularz wyszukiwania tylko przewija stronę do ofert i nie filtruje. Newsletter zawsze pokazuje „Dzięki!” bez wysyłania i bez obsługi błędu.
- **Długość linii.** Największa to ok. 57 znaków w leadzie przy 1440 px (oszacowanie z szerokości kolumny). Przy żadnej szerokości nie przekracza 75 znaków.
- **Bez JavaScriptu.** Wszystkie 30 elementów `.reveal` ma `opacity:0` (l.804): statystyki, kroki, kategorie, oferty, opinie, cennik, CTA. Statystyki pokazują „0”.
- **Przy 320 px** strona ma przewijanie poziome: szerokość dokumentu 385 px. Winowajcy to plany cennika (do 385 px), `.stat-box` (346) i zakładki (321).
- **Menu mobilne.** `menu-toggle` nie ma `aria-expanded`. Przy ≤ 900 px znika przycisk „Zaloguj się”, a przy ≤ 600 px „Dodaj ogłoszenie”, więc na telefonie nie ma żadnej akcji w nagłówku poza menu.

## Krok 3. Rozrzut wartości

- **Kolory tekstu przy 1440 px:** 12 unikalnych pełnych kolorów plus tekst z gradientem (`transparent` fill): `#111827`, `#4f46e5`, `#6b7280`, `#fff`, `#10b981`, `#9ca3af`, `#2563eb`, `#059669`, `#7c3aed`, `#f59e0b`, `#94a3b8`, `#64748b`.
- **Rozmiary fontu przy 1440 px:** 13 (12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 40, 44, 56 px).
- **Promienie zaokrąglenia w kodzie:** 9 wartości `border-radius` (8, 10, 12, 16, 20, 24 px, `50%`, `999px`, `var(--radius)`). Plus `rx` 2 i 5 w SVG.
- **Odstępy (padding, margin, gap):** 24 unikalne wartości w px: 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96, 120. Poza siatką 4 px jest 7: 2, 3, 5, 6, 10, 14, 18.
- **Kolory na sztywno poza `:root`:** 42 unikalne hexy i 8 unikalnych `rgb()/rgba()`. W całym pliku jest 47 hexów i 11 `rgba`.

## Wynik

### 1. Najważniejsze znaleziska

| Znak lub błąd | Gdzie | Co widać | Dlaczego problem | Czym zastąpić | Pewność |
|---|---|---|---|---|---|
| Indygo + cyjan + gradient we wszystkim | l.19, 103, 186, 414, 653, 724 | Ta sama para kolorów w logo, h1, liczbach, słupkach, CTA | Generyczny wygląd; kolor akcji bez uzasadnienia w marce | Jeden kolor akcji z uzasadnieniem, bez gradientu w tekście | sprawdzone |
| Kontrast tekstu | gwiazdki, loga firm, `.match`, `+%`, chipy, inicjały, stopka | 2,15–3,75 przy wymaganych 4,5 | Dostępność | Ciemniejszy odcień każdego z kolorów, tokeny z gwarantowanym kontrastem | sprawdzone (jednolite tła) |
| Kontrast na gradiencie CTA | l.724, „Jestem pracodawcą” | Biały tekst zbliża się do cyjanu (ok. 2,4) | Dostępność | Jednolite tło sekcji CTA | przypuszczenie (brak pomiaru) |
| Treść znika bez JS | `.reveal` l.804 | 30 z 30 elementów `opacity:0` | UX / dostępność | Ukrywanie tylko gdy JS dodał klasę; domyślnie treść widoczna | sprawdzone |
| Poziome przewijanie przy 320 px | `.plan`, `.stat-box`, `.tabs` | Szerokość dokumentu 385 px | UX | `minmax(0,1fr)`, zawijanie zakładek, `min-width:0` | sprawdzone |
| Fokus i klawiatura | l.222, 777; `.tag`, `.category` | `outline:none`, elementy klikalne bez `tabindex` ani roli | Dostępność | Widoczny `:focus-visible` globalnie; `<button>` / `<a>` zamiast `<span>`/`<div>` | sprawdzone |
| Pola bez etykiety | 3 pola (wyszukiwanie, miasto, e-mail) | Tylko placeholder | Dostępność | Widoczne `<label>` | sprawdzone |
| Wymyślone dane i klienci | opinie, loga, „TechNova”, 98%, +2 345, 3 500 firm | Wiarygodnie wyglądające liczby i nazwy bez źródła | Generyczny wygląd (treść) i ryzyko wprowadzenia w błąd | Prawdziwe dane lub jawne oznaczenie przykładu | sprawdzone (kod), przypuszczenie (zamiar) |
| Niespójne liczby | kategorie (11 315 vs 12 000), lejek (słupki vs wartości), „Rozmowy 96” | Dane sobie przeczą | UX / zaufanie | Jedno źródło liczb, słupki liczone z wartości | sprawdzone |
| Puste obietnice | h1, lead, „Rekrutuj mądrzej”, „idealne dopasowanie” | Zdania pasujące do każdej platformy pracy | Generyczny wygląd | Konkret: co robi TalentHub, czego nie robią inne | sprawdzone |
| Układ-szablon | hero (badge + kolorowe słowo + dwa przyciski), rząd 4 liczb, 3 karty, 3 plany, CTA w gradiencie | Pełny zestaw szablonu SaaS | Generyczny wygląd (efekt kumulacji) | Układ wynikający z zadań użytkownika (szukanie, aplikowanie) | sprawdzone |
| Karty unoszące się, karta w karcie, blur | `.float-card`, `.dashboard`, nagłówek | Animowane karty i kafelki w kafelkach w hero i panelu | Generyczny wygląd | Jedna płaska lista w hero, zero animacji pływania | sprawdzone |
| Ikony na kolorowych kafelkach | 8 kategorii, 4 funkcje, 3 kroki | 8 różnych pastelowych tonów bez znaczenia | Generyczny wygląd | Jedna rodzina ikon w jednym kolorze albo sam tekst | sprawdzone |
| Awatary i loga z inicjałami | hero, opinie, oferty | Kolorowe kółka i kwadraty z literami | Generyczny wygląd; część nie przechodzi kontrastu | Zdjęcie, prawdziwe logo albo neutralny placeholder | sprawdzone |
| Brak stanów | wyszukiwanie, newsletter, oferty | Brak ładowania, braku wyników, błędu; formularz tylko przewija | UX | Trzy stany jako komponent z komunikatem „co zrobić” | sprawdzone |
| Rozrzut wartości | cały plik | 9 promieni, 24 odstępy (7 poza siatką), 42 hexy poza tokenami | Generyczny wygląd (brak systemu) | Skala tokenów: 4–5 promieni, odstępy z siatki 4 px | sprawdzone |

### 2. Pozostałe znaleziska

- Pulsująca zielona kropka w badge i animacja `float` nie mają wyłączenia dla `prefers-reduced-motion`.
- Zakładki „Dla kandydatów / Dla pracodawców” nie mają ról ani `aria-selected`.
- Hero-wizualizacja jest ukryta przy ≤ 900 px, więc na telefonie jest tylko tekst i formularz.
- Opinie w gwiazdkach ★★★★★ bez tekstu alternatywnego. Wszystkie trzy mają maksymalną ocenę.
- Plan „Pro” jest powiększony o 3% przez `transform: scale`, co psuje wyrównanie siatki.
- Czcionka Inter z Google Fonts to najczęstszy wybór domyślny; bez ładowania zewnętrznego spada na systemową.
- Linki `#` w całej nawigacji, stopce i przyciskach nigdzie nie prowadzą.
- Przycisk „Szukaj ofert” przewija do sekcji, której zawartość się nie zmienia.
- Brak elementu `<main>`; w kartach funkcji nagłówki to `h4` bez `h3` nad nimi.

### 3. Liczby z kroku 3

Podane wyżej: 12 kolorów tekstu (+ gradient), 13 rozmiarów fontu, 9 promieni, 24 odstępy (7 poza siatką 4 px), 42 hexy i 8 rgba poza tokenami.

### 4. Pięć decyzji

1. **Jeden kolor akcji z uzasadnieniem i zakaz gradientów.** Nazwać, dlaczego TalentHub ma właśnie ten kolor, i użyć go tylko do akcji. **Token** (`--color-action`) plus **zasada** (brak gradientu w tekście, tle i przyciskach).
2. **Paleta ze zmierzonym kontrastem.** Każda para tekst/tło z progiem 4,5 : 1 (lub 3 : 1 dla dużych elementów), sprawdzona raz, a nie przy każdym chipie. **Token** (pary kolorów) z testem w CI.
3. **Prawdziwa treść zamiast zmyślonej.** Jedno zdanie o tym, co TalentHub robi inaczej niż inne serwisy; liczby tylko z jednego źródła; opinie i firmy tylko prawdziwe lub oznaczone. **Zasada**.
4. **Jedna skala kształtu i odstępów.** 3–4 promienie (np. 4, 8, 12, pełny tylko dla tagów) i odstępy z siatki 4 px; koniec z `999px` na wszystkim. **Token**.
5. **Komponenty ze stanami i dostępnością od początku.** Przycisk, pole z etykietą, tag/chip jako `<button>`, karta oferty, widoczny fokus, stany ładowanie / pusto / błąd, treść widoczna bez JS. **Komponent** (z regułą: nic klikalnego jako `<div>` ani `<span>`).

### Czego nie sprawdziłem

- Kontrastu na gradiencie CTA i na półprzezroczystych tłach (szacunek).
- Zachowania z czytnikiem ekranu.
- Zawartości zakładki „Dla pracodawców” w pomiarach kolorów i fontów (była ukryta).
