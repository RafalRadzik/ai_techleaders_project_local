# Tokeny: DevMentor

- Data: 2026-10-21. Zatwierdzone przez autora: T1–T8, kolor akcji = atrament, strona główna poza zakresem.
- Podstawa: `lekcja-06/referencje.md` (decyzje przyjęte, K1 i K2 rozstrzygnięte przez autora).
- Plik tokenów: `packages/ui/src/tokens.css` (wartości `:root` i `.dark`, mapowanie `@theme inline`). `--font-sans` i `--font-mono` są w `packages/app/src/app/globals.css`.
- Istniejące nazwy (`background`, `foreground`, `primary`, `muted-foreground`, `border`, `input`, `ring` itd.) opisują przeznaczenie, więc zostają jako warstwa znaczeniowa. Pod nimi powstaje warstwa surowa `--neutral-*` (K3: bez zmiany nazw).
- Ten plik opisuje decyzje o tokenach. **Nie zmienia** `tokens.css`; zmiana kodu to osobny krok.
- Wartości palety i odstępów są propozycją agenta zatwierdzoną przez autora; referencje podają tylko „ciepłe szarości” i „gęsto na listach, spokojnie w sesji”.

## Tokeny

| token | warstwa | wartość | pochodzenie | gdzie używać | gdzie nie używać |
|---|---|---|---|---|---|
| `--neutral-50` | surowa | oklch(0.985 0.005 85) | R01.4 | tylko w tokens.css | w komponentach wprost |
| `--neutral-100` | surowa | oklch(0.97 0.007 85) | R01.4 | j.w. | j.w. |
| `--neutral-200` | surowa | oklch(0.922 0.009 85) | R01.4 | j.w. | j.w. |
| `--neutral-400` | surowa | oklch(0.708 0.012 75) | R01.4 | j.w. | j.w. |
| `--neutral-500` | surowa | oklch(0.62 0.012 75) | R01.4 | j.w. | j.w. |
| `--neutral-600` | surowa | oklch(0.56 0.012 75) | R01.4 | j.w. | j.w. |
| `--neutral-700` | surowa | oklch(0.50 0.012 75) | R01.4 | j.w. | j.w. |
| `--neutral-800` | surowa | oklch(0.269 0.010 70) | R01.4 | j.w. | j.w. |
| `--neutral-900` | surowa | oklch(0.205 0.010 70) | R01.4 | j.w. | j.w. |
| `--neutral-950` | surowa | oklch(0.145 0.010 70) | R01.4 | j.w. | j.w. |
| `background` | znaczeniowa (istnieje) | jasny: neutral-50; ciemny: neutral-950 | R01.4 | tło strony | tekst |
| `card`, `popover` | znaczeniowa (istnieje) | jasny: neutral-50; ciemny: neutral-900 | R01.4 | tło panelu, okna | zagnieżdżanie karty w karcie (A01) |
| `foreground`, `card-foreground`, `popover-foreground` | znaczeniowa (istnieje) | jasny: neutral-950; ciemny: neutral-50 | R01.4 | tekst główny, autor wiadomości (R02.3) | metadane |
| `muted`, `secondary`, `accent` | znaczeniowa (istnieje) | jasny: neutral-100; ciemny: neutral-800 | R01.4 | tła drugorzędne, hover | główna akcja |
| `muted-foreground` | znaczeniowa (istnieje) | jasny: neutral-700; ciemny: neutral-400 | R01.4, R02.3 | czas wiadomości, metadane, opisy | tekst główny |
| `primary` | znaczeniowa (istnieje) | jasny: neutral-900; ciemny: neutral-200 | R01.5 (P2), A01 | jedna główna akcja na ekran | więcej niż jedna na ekran |
| `primary-foreground` | znaczeniowa (istnieje) | jasny: neutral-50; ciemny: neutral-900 | R01.5 | tekst na `primary` | – |
| `border` | znaczeniowa (istnieje) | jasny: neutral-200; ciemny: bez zmiany (biel, alfa 10%) | R01.3 | cienka linia między wierszami (1px) | granica pola formularza |
| `input` | znaczeniowa (istnieje) | jasny: neutral-500; ciemny: neutral-600 | poprawka kontrastu (nie referencja) | granica pola formularza | separator wierszy |
| `ring` | znaczeniowa (istnieje) | jasny: neutral-500; ciemny: neutral-600 | poprawka kontrastu (nie referencja) | pierścień fokusa | dekoracja |
| `destructive` | znaczeniowa (istnieje) | bez zmiany | – | akcje i komunikaty destrukcyjne | – |
| `destructive-foreground` | znaczeniowa (istnieje) | jasny: bez zmiany (neutral-50); ciemny: neutral-950 | poprawka kontrastu (nie referencja) | tekst na `destructive` | – |
| `--font-mono` | znaczeniowa (istnieje, w `globals.css`) | bez zmiany (`ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`) | R01.2 | kod, nazwy plików, identyfikatory | proza |
| `--space-1` | surowa (nowa) | 4px | R01.1 | tylko w tokens.css | wprost w komponentach |
| `--space-2` | surowa (nowa) | 8px | R01.1 | j.w. | j.w. |
| `--space-3` | surowa (nowa) | 12px | R01.1 | j.w. | j.w. |
| `--space-4` | surowa (nowa) | 16px | R01.1 | j.w. | j.w. |
| `--space-6` | surowa (nowa) | 24px | K1 | j.w. | j.w. |
| `--space-8` | surowa (nowa) | 32px | R01.1 | j.w. | j.w. |
| `--space-12` | surowa (nowa) | 48px | R01.1 | j.w. | j.w. |
| `--space-group` | znaczeniowa (nowa) | space-2 (8px) | R01.1 | elementy w jednej grupie | między sekcjami |
| `--space-between-groups` | znaczeniowa (nowa) | space-4 (16px) | R01.1 | między grupami elementów | w grupie |
| `--space-panel` | znaczeniowa (nowa) | space-4 (16px) | R01.1, K1 | wnętrze panelu na listach i tabelach | ekran sesji |
| `--space-panel-calm` | znaczeniowa (nowa) | space-6 (24px) | K1, R02.1 | wnętrze ekranu sesji i rozmowy | listy i tabele |
| `--space-row-y` | znaczeniowa (nowa) | space-2 (8px; jak dzisiejsze `py-2` w DataTable) | R01.1 | pionowy odstęp wiersza listy | rozmowa |
| `--space-row-x` | znaczeniowa (nowa) | space-4 (16px; jak dzisiejsze `px-4` w DataTable) | R01.1 | poziomy odstęp wiersza listy | rozmowa |
| `--space-section` | znaczeniowa (nowa) | space-12 (48px) | R01.1 | między sekcjami strony | wewnątrz panelu |

Tokeny komponentów: brak. Żaden komponent nie potrzebuje własnej wartości.

## Pary kolorów i kontrast (WCAG; progi: tekst 4,5 : 1, elementy interfejsu 3 : 1)

**Jasny motyw (nowe wartości)**
- foreground / background: 18,97, spełnia
- foreground / muted: 18,16, spełnia
- muted-foreground / background: 5,75, spełnia
- muted-foreground / muted: 5,51, spełnia
- primary-foreground / primary: 17,17, spełnia
- destructive-foreground / destructive: 4,56, spełnia (zapas niewielki)
- `text-destructive` / background: 4,56, spełnia; / muted: 4,37, **poniżej progu**; użycie na `muted` nie występuje w kodzie, więc bez poprawki
- input (granica) / background: 3,49, spełnia (próg 3)
- ring / background: 3,49, spełnia (próg 3)
- primary / background (granica przycisku): 17,17, spełnia
- border (separator wierszy) / background: 1,21. Dekoracyjny, próg 3 : 1 go nie dotyczy, ale linia jest ledwo widoczna (dotychczas 1,26)

**Ciemny motyw (nowe wartości)**
- foreground / background: 18,97, spełnia
- foreground / card: 17,17, spełnia
- muted-foreground / background: 7,63, spełnia
- muted-foreground / card: 6,91, spełnia
- muted-foreground / muted: 5,83, spełnia
- primary-foreground / primary: 14,24, spełnia
- destructive-foreground / destructive: 6,85, spełnia
- `text-destructive` / background: 6,85; / card: 6,20, spełnia
- input (granica) / background: 4,25, spełnia
- ring / background: 4,25, spełnia
- primary / background (granica przycisku): 15,72, spełnia

**Pary poniżej progu przed zmianą (stare wartości), wszystkie poprawione**
- Jasny: input / background 1,26 (próg 3); ring / background 2,59 (próg 3); muted-foreground / muted 4,34 (próg 4,5).
- Ciemny: destructive-foreground / destructive 2,77 (próg 4,5).

Wartości: kontrasty policzone skryptem z konwersją oklch → sRGB (pojedyncze wartości poza gamutem obcięte). Przed zapisem do `tokens.css` trzeba je potwierdzić w narzędziu przeglądarkowym.

## Decyzje, które nie są tokenami (zasady i cechy komponentów)

Zasady:
- **R01.5:** na ekranie jest jedna akcja `primary`; pozostałe są drugorzędne (`secondary`, `muted`).
- **R01.3:** wiersze rozdziela 1px `border` (`divide-y`), bez karty ani cienia na wiersz.
- **R01.2:** `font-mono` dla kodu, nazw plików i identyfikatorów; nigdy dla prozy.
- **K1:** listy i tabele używają `space-panel` i `space-row-*`; ekran sesji i rozmowy używa `space-panel-calm`.
- **K2:** brak wskaźników obecności, „online teraz” i „pisze…”.
- **R02.4 (P3):** powiadomienia wyłącznie o zdarzeniach rezerwacji i sesji.
- **R02.5 (P4):** zwykły tekst, bez reakcji emoji.
- **A01:** bez gradientów, `backdrop-filter`, indygo jako koloru akcji, karty w karcie, pigułek (`rounded-full`) jako domyślnego kształtu, trzech identycznych kart z ikoną, rzędu wielkich liczb, pigułki „nowość”, iskierek (tag „AI agents” to zwykły tekst).
- **A02:** bez pasków postępu, certyfikatów, modułów i lekcji.
- **A03:** bez gwiazdek, wyników, „top mentor”, sortowania po ocenie.
- **A04:** bez ikon kamery i mikrofonu, „Dołącz do rozmowy”, kafelków uczestników.
- **A05:** bez liczników odliczających, „online teraz”, „odpowiedź w godzinę”, „zostały 2 sloty”.
- **A06:** bez przycisków udostępniania, polubień i reakcji przy sesjach i notatkach.
- **Promień:** bez nowego tokenu; największy w użyciu to istniejący `radius-xl`.

Cechy komponentów:
- **R02.3:** wiadomość ma autora (`foreground`, medium) i czas (`muted-foreground`).
- **R02.1:** na ekranie sesji rozmowa zajmuje środek.
- **R02.2:** pole wiadomości bez zbędnych kroków (szybkość pisania).
- **R02.6 (P5):** krótki boczny pasek, jedna grupa linków wg roli. Zachować dostępny link „Users” (`tests/integration/admin.integration.test.ts`).

## Luki (T8: zostają otwarte)
- Kolor akcji: zostaje atrament (`primary` = prawie czarny, ciepły). Brak referencji i wartości.
- Typografia: brak kroju tekstu, skali i wag.
- Ruch: brak referencji i czasów animacji.
- Statusy (sukces, ostrzeżenie): brak tokenów; admin używa surowego `emerald-600`.

## Uwagi (poza zakresem tego kroku)
- `packages/app/src/app/page.tsx` używa surowych klas `zinc-*` i `rounded-full` na przyciskach. To jest sygnał z A01 i omija tokeny; zostawiam do osobnego kroku.
- K3 w `referencje.md` pozostaje „czeka na autora”; ten plik przyjmuje rozstrzygnięcie T2 (bez zmiany nazw, nowa warstwa surowa pod spodem). Aktualizacja K3 w pliku referencji wymaga Twojego polecenia.
