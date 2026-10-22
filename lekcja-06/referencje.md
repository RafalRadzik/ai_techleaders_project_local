# Referencje: DevMentor

- Data: 2026-10-21
- Kto wybierał: autor zadania (imię nie podane; do uzupełnienia w kolumnie „Kto wybrał”).
- Słowa charakteru (potwierdzone 2026-10-21): rzeczowy, gęsty (ale czytelny), ciepły, rozmowny, jednoznaczny.
- Antycharakter (potwierdzony 2026-10-21): szablonowy, efekciarski, hałaśliwy, szkoleniowy, grywalizowany.
- Podstawa produktowa: `.ai/specs/product-brief.md`, wywiady w `.ai/specs/research/`, decyzje N01, N02, D02, D22.
- Stan materiału: zrzuty brak, linki brak („link, nie otwarty”). Każda obserwacja poniżej jest **parafrazą opisu autora**, nie oglądu ekranu. Liczb (wysokość wiersza, rozmiar fontu, grubość linii, odcienie) nie znamy.

Nic w tym pliku nie jest jeszcze regułą. Zasady i tokeny powstają w następnym kroku, z tego pliku, i każdą z nich zatwierdza autor osobno.

## Referencje

Legenda statusu: **przyjęte** = zapisane z opisu autora; **przyjęte (propozycja)** = propozycja agenta, przyjęta przez autora 2026-10-21.

| # | Referencja | Źródło | Kto wybrał | Obserwacja (parafraza, bez zrzutu) | Bierzemy | Nie bierzemy | Robimy zamiast tego | Dlaczego pasuje do produktu | Rodzina | Waga | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| R01.1 | GitHub | strona repozytorium i lista pull requestów; link: brak, zrzut: brak | autor | Na jednym ekranie jest dużo informacji naraz i mimo to da się to czytać. Liczba wierszy, kolumn i pól w wierszu: nie wiadomo. | Dużo informacji na ekranie, a nadal czytelnie. | – | – | Listy mentorów (R13), rezerwacje i tabele operatora to listy wierszy. Uwaga: w badaniach nie ma dowodu, że mentee chce gęstości; źródłem jest gust autora i tezę trzeba sprawdzić na tych listach. | kompozycja i gęstość | musi być | przyjęte |
| R01.2 | GitHub | j.w. | autor | Kod i nazwy plików są w innym foncie niż reszta tekstu. Wg autora: font o stałej szerokości. Nazwa kroju: nie wiadomo. | Kod i nazwy plików w foncie o stałej szerokości, reszta w innym kroju. | – | – | Mentee wkleja kod do sesji („someone who has actually done this looks at my code”, wywiad 2026-08-20); wymiana tekstowa (N01) zawiera fragmenty kodu i nazwy plików, które trzeba odróżnić od prozy. | typografia | musi być | przyjęte |
| R01.3 | GitHub | j.w. | autor | Wiersze listy są rozdzielone cienką linią. Grubość i kolor linii: nie wiadomo. Czy karty, cienie lub tła wierszy też występują: nie wiadomo. | Cienkie linie między wierszami. | – | – | **Związek słaby**: poza listami (mentorzy, rezerwacje) nie umiem tego uzasadnić z badań. Na razie gust; staje się decyzją, gdy wskażemy ekran, na którym linia zastępuje kartę. | komponenty | musi być | przyjęte |
| R01.4 | GitHub | j.w. | autor | Wszystko jest szare; autor odbiera to jako „mało ciepła”. | – | Zimne, jednolicie neutralne szarości. | Ciepłe szarości (propozycja). Wartości nie ustalone. | Brak dowodu w badaniach; wynika z gustu. Uwaga: obecne tokeny w `packages/ui/src/tokens.css` mają chroma 0 (czyste szarości), więc zmiana dotknie istniejącego kodu (patrz K3). | kolor | musi być | przyjęte (propozycja) |
| R01.5 | GitHub | j.w. | autor | Trudno się zorientować, co jest najważniejsze: elementy mają zbliżoną wagę wizualną (parafraza). | – | Ekrany bez widocznej hierarchii. | Jedna główna rzecz wyróżniona na ekranie (propozycja). | Mentee ma pilny problem i jedną główną akcję (wybrać slot, odpowiedzieć, zaakceptować notatkę, R12); mentor widzi to, na co czeka odpowiedź. | kompozycja i gęstość | musi być | przyjęte (propozycja) |
| R02.1 | Slack | widok kanału z wątkiem; link: brak, zrzut: brak | autor | Rozmowa zajmuje środek ekranu jako główny element. Układ reszty ekranu: nie wiadomo. | Rozmowa jako centrum ekranu. | – | – | Sesja to tekstowa wymiana 25 lub 50 minut (D01, N01), a jej wynik to pisemna odpowiedź. Uwaga: gdzie wymiana się odbywa (w DevMentor czy poza nim) jest otwarte (Q18). | kompozycja i gęstość | warto | przyjęte |
| R02.2 | Slack | j.w. | autor | Szybko się pisze i odpisuje. Wg autora chodzi o szybkość pisania w polu wiadomości, nie o wskaźniki obecności. | Szybkie pisanie i odpisywanie: pole wiadomości bez zbędnych kroków. | Wskaźniki obecności, „online teraz” (decyzja autora, K2). | – | Mentor pisze pisemną odpowiedź, a mentee odpisuje w ograniczonym czasie sesji. Brak obietnicy szybkości (R14, D22) nie koliduje z szybkością pisania. | komponenty | warto | przyjęte |
| R02.3 | Slack | j.w. | autor | Widać, kto co napisał i kiedy: autor i czas są przy wiadomości. Forma (godzina przy każdej czy grupowana): nie wiadomo. | Autor i czas przy każdej wiadomości. | – | – | Pisemny ślad sesji ma być wiarygodny: odpowiedź i notatka (R12) mają wskazanego autora („I keep my name on them”, wywiad 2026-08-22). | komponenty | warto | przyjęte |
| R02.4 | Slack | j.w. | autor | Za dużo powiadomień. | – | Powiadomienia o wszystkim. | Powiadomienia tylko o zdarzeniach rezerwacji i sesji (propozycja). | Użytkownik przychodzi z konkretną sprawą, nie na czat w tle; zdarzenia rezerwacji i sesji są jedynymi, na które musi zareagować. | ruch i reakcja | warto | przyjęte (propozycja) |
| R02.5 | Slack | j.w. | autor | Emoji są wszędzie (w treści i jako reakcje). | – | Emoji w interfejsie i reakcje emoji. | Zwykły tekst, bez reakcji emoji (propozycja). | Rzeczowy, techniczny ton; pisemna odpowiedź mentora nie ma być reagowana „na wesoło”. | ton wypowiedzi | warto | przyjęte (propozycja) |
| R02.6 | Slack | j.w. | autor | Boczny pasek jest w bałaganie (autor, bez szczegółów). | – | Zatłoczony boczny pasek. | Krótki pasek: jedna grupa linków wg roli (propozycja). | Brief definiuje trzy role (mentee, mentor, operator), każda ma własny, krótki zestaw miejsc. Uwaga: test integracyjny `admin.integration.test.ts` wymaga linku „Users” w adminie. | kompozycja i gęstość | warto | przyjęte (propozycja) |

## Antyreferencje

| # | Wygląd | Dlaczego nie | Podpis do uniknięcia | Źródło (gust / badania / propozycja) |
|---|---|---|---|---|
| A01 | Generyczny wygląd AI (typowa strona startupu AI) | „Wygląda jak wszystko inne” (autor). Dodatkowo produkt ma tag „AI agents” i później MCP: bez dyscypliny wszystko dotyczące AI wyglądałoby jak ta strona. | **Autora:** fioletowy gradient, szklane karty, iskierki. **Rozszerzenie (przyjęte propozycja, z `lekcja-06/audyt.md` krok 1):** gradient w nagłówku i na przycisku; indygo jako kolor akcji; `backdrop-filter: blur`; karta w karcie; pigułka „nowość” nad nagłówkiem; rząd wielkich liczb; trzy identyczne karty z ikoną; pigułki `border-radius: 999px` jako domyślny kształt. Tag „AI agents” jest zwykłym tagiem tekstowym, bez ikony iskierek. | gust (autor) + propozycja (rozszerzenie) |
| A02 | Wygląd kursu (e-learning) | Mentee: „I don't want a course, I want an answer” (wywiad 2026-08-20); poprzedni kurs był „generic, and outdated”. | Paski i wskaźniki postępu, certyfikaty, moduły i lekcje, „ukończono 3/10”, odznaki za naukę. | badania (propozycja, przyjęta) |
| A03 | Oceny, rankingi, wyniki | N02 i R04: bez ocen; R13: lista nigdy nie jest sortowana wynikiem. Mentor: „my GitHub is my profile”. | Gwiazdki, liczbowe wyniki, „top mentor”, ranking, sortowanie po ocenie, liczba recenzji. | badania (propozycja, przyjęta) |
| A04 | Wygląd wideo-rozmowy | N01 i R03: sesje są tekstowe, a produkt mówi to na każdym ekranie sesji; mentee: „text is fine, faster”. | Ikona kamery lub mikrofonu, „Dołącz do rozmowy”, kafelki uczestników z awatarami, tło „spotkania”. | badania (propozycja, przyjęta) |
| A05 | Presja szybkości | R14 i D22: 1.0 nie obiecuje szybkości; mierzymy czas od rezerwacji do startu. | Liczniki odliczające, „online teraz”, „odpowiedź w godzinę”, „zostały 2 sloty”, pulsujące kropki dostępności. | badania (propozycja, przyjęta) |
| A06 | Publiczność i udostępnianie | D02: nic z sesji nie jest publikowane bez zgody mentee („trust is the product”). | Przyciski „udostępnij”, polubienia i reakcje przy sesjach i notatkach, widok przypominający publiczny feed. | badania (propozycja, przyjęta) |

## Konflikty i rozstrzygnięcia

| Konflikt | Referencje | Rozstrzygnięcie | Kto zdecydował |
|---|---|---|---|
| K1: gęsto czy rozmowa w centrum | R01.1 (gęstość, „musi być”) kontra R02.1 (rozmowa w centrum, „warto”) | Gęsto na listach i tabelach; spokojnie na ekranie sesji, gdzie rozmowa jest w centrum. | autor, 2026-10-21 |
| K2: szybkość kontra brak obietnicy szybkości | R02.2 kontra R14 i D22 (brak obietnicy szybkości), A05 | „Szybko” znaczy szybkość pisania w polu wiadomości. Bez wskaźników obecności i „online teraz”. | autor, 2026-10-21 |
| K3: ciepłe szarości kontra obecne tokeny | R01.4 kontra `packages/ui/src/tokens.css` (chroma 0, także `.dark`) | **Otwarte.** Do rozstrzygnięcia w kroku tokenów: zmienić istniejące wartości czy dodać warstwę znaczeniową nad nimi. | czeka na autora |

## Luki

Rodziny bez referencji lub z referencją tylko „negatywną”:
- **Kolor:** poza „ciepłe szarości” brak jakiejkolwiek wartości i brak koloru akcji. Antyreferencja A01 wyklucza indygo i gradient, ale nic nie mówi, co zamiast tego.
- **Typografia:** poza fontem o stałej szerokości dla kodu brak kroju tekstu, skali i wag.
- **Ruch i reakcja:** brak referencji (jest tylko decyzja o powiadomieniach, R02.4).
- **Ton wypowiedzi:** brak referencji (jest tylko decyzja o emoji, R02.5). Brief wskazuje na „plain description” (N02), ale to nie referencja.
- **Komponenty:** brak referencji dla przycisków, pól formularzy, tagów, kart mentora.

Pytania bez odpowiedzi:
- Czy referencje dotyczą jednakowo stron publicznych (Tailwind) i adminu (shadcn)?
- Czy produkt ma ciemny motyw (`tokens.css` ma `.dark`)? Jeśli tak, referencje nic o nim nie mówią.
- Kto wybierał: imię do uzupełnienia.
- K3 (powyżej).
- Zrzuty R01 i R02: autor zdecydował o zapisie bez zrzutów. Obserwacje pozostają parafrazą; zrzut poprawi je przed krokiem tokenów (zwłaszcza R01.1–R01.3 i R02.3).

## Obrazy

Brak. Pliki obok tego dokumentu (nazwy w formacie `R01-krotki-opis.png`) mają być dodane, gdy autor dostarczy zrzuty.
