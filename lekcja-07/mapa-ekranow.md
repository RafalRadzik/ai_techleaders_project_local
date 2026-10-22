# Mapa ekranów: Epik 01, konta i role

Status: **zatwierdzona** (2026-10-22), z decyzjami przy każdej luce. Niczego nie zbudowano. Po zatwierdzeniu ID ekranów (`s01`–`s10`) i stanów (`s02.4` itd.) przestają się zmieniać, bo będą do nich przypięte komentarze.

## Materiały użyte i wybory

- Historie według `.ai/specs/backlog.md`: **#20** (E01-S01, GitHub), **#21** (E01-S02, e-mail i hasło), **#22** (E01-S03, role i dostęp). Numery z backlogu zgadzają się z podanymi w poleceniu. Specyfikacja i dokumentacja design systemu używają starych numerów #12, #13, #14 (patrz luka L23).
- Specyfikacja Epiku 01: `.ai/specs/2026-09-04-accounts-and-roles.md` (istnieje, to jedyna pasująca, status `active`).
- Brief: `.ai/specs/product-brief.md` (D07, D08, D19, R06, R07, R18, N01, N02).
- Persony: **brak** `.ai/specs/research/personas.md`. Użyłem dwóch wywiadów: `2026-08-20-interview-working-dev.md` (mentee) i `2026-08-22-interview-mentor.md` (mentor).
- Design system: `packages/ui/src` (`AuthLayout`, `AccountForm`, `AuthFeedback`, `AccessStatus`, `AppShell`, `DataTable`, feedback) oraz Storybook (`Guidelines.mdx`, `E01Flow.mdx`, `Gaps.mdx`).
- Treść interfejsu zostaje po angielsku (AGENTS.md: nie zmieniamy języka UI). Mapa jest po polsku.

### Skróty źródeł

`#20.K1` = kryterium akceptacji 1 z zgłoszenia #20 (kryteria z treści zgłoszeń na GitHubie). `SP` = tylko w specyfikacji, nie w zgłoszeniu. `EC n` = Edge Case n ze specyfikacji. `UI§` = sekcja UI/UX specyfikacji. `DS` = tylko w design systemie. `L nn` = luka z sekcji 4.

## 0. Historie i kryteria akceptacji w tym przepływie

| Kryterium | Treść (skrót) | Gdzie na mapie |
|---|---|---|
| #20.K1 | Developer autoryzuje GitHub, powstaje konto, widzi home mentee | s02, s05, s06 |
| #20.K2 | Mentor po zaproszeniu loguje się GitHubem i ląduje na home mentora | s02, s05, s07 (zaproszenie: L01) |
| #20.K3 | Anulowanie autoryzacji: brak konta, ekran logowania mówi to wprost | s02.4 |
| #20.K4 | Wygasła sesja: prośba o ponowne logowanie, nic z danych użytkownika przed tym | s02.9, s06.4, s07.4, s08.3, s09.7 |
| #20.K5 | Każdy ekran logowania: GitHub pierwszy, e-mail drugi | s02.1, s03.1 |
| #20.K6 (SP) | E-mail z GitHuba pasuje do niezweryfikowanego konta: nic się nie łączy, jest wyjaśnienie | s02.8 |
| #20.K7 (SP) | Mentor + operator ląduje na `/admin` i może wejść na obie powierzchnie | s08.1 |
| #21.K1 | Rejestracja e-mailem, potwierdzenie adresu, home mentee | s03, s04, s06 (weryfikacja: L06) |
| #21.K2 | Zły login lub hasło: komunikat nie mówi, co było złe, brak sesji | s02.11 |
| #21.K3 | E-mail powiązany z GitHubem: odmowa ze wskazaniem logowania GitHubem | s03.5 |
| #21.K4 | Mentor bez GitHuba akceptuje zaproszenie hasłem i dostaje rolę mentora | **brak ekranu w E01** (L01) |
| #22.K1 | Mentee otwiera ekran mentora: odmowa i przekierowanie do swojego home | s10.1 |
| #22.K2 | Mentor otwiera ekran operatora: odmowa | s10.2 |
| #22.K3 | Founder A i B mają rolę operatora; nikt poza allowlistą | s08 (brak ekranu nadawania ról, z założenia) |
| #22.K4 | Mentee widzi tylko swoje sesje, mentor tylko swoje | **brak ekranu w E01** (L02) |
| #22.K5 | Zalogowany bez zaproszenia nie znajduje drogi do zostania mentorem (R07) | s06.6 |
| #22.K6 (SP) | Odwołany operator odmowa przy następnym żądaniu, także przy nawigacji klienckiej | s08.6, s09.6, s10.3 |
| #22.K7 (SP) | Mentee próbujący listować użytkowników dostaje odmowę, tylko operator może | s09.5 |

## 1. Tabela ekranów

Trasy pochodzą ze specyfikacji (`UI§`). **s05 jest atrapą zewnętrznego GitHuba**, nie ekranem produktu. Ekran weryfikacji linku z maila (`/api/auth/verify-email`) to trasa API z przekierowaniem, nie ekran (patrz L06).

| ID | Ekran | Rola (kto widzi) | Stany | Historia lub kryterium | Komponenty DS |
|---|---|---|---|---|---|
| s01 | Strona główna `/` | Wszyscy; niezalogowany to główny odbiorca | s01.1 domyślny (UI§Sign out: cel wylogowania; treść L14)<br>s01.2 po wylogowaniu (UI§Sign out, EC27; komunikat L14) | UI§Sign out, EC27 | Brak komponentów E01 (publiczny Tailwind). Opcjonalnie `AuthFeedback` `signed-out` (DS) |
| s02 | Logowanie `/sign-in` | Niezalogowany. Zalogowany jest przekierowany do swojego home | s02.1 domyślny: GitHub pierwszy, e-mail drugi (#20.K5, D07)<br>s02.2 wysyłanie formularza, ładowanie (DS `AccountForm` submitting; EC18)<br>s02.3 e-mail wyłączony, tylko GitHub (UI§/sign-in, do Slice 4; DS `emailDisabled`)<br>s02.4 GitHub anulowany `?cancelled=1` (#20.K3, EC2)<br>s02.5 niezgodny lub wygasły `state` `?error=state` (EC6)<br>s02.6 GitHub niedostępny lub nieskonfigurowany `?error=unavailable` (EC1, EC7, EC8; L08)<br>s02.7 GitHub bez zweryfikowanego głównego e-maila (EC3; L07)<br>s02.8 e-mail pasuje do niezweryfikowanego konta (#20.K6, EC4; L07)<br>s02.9 sesja wygasła, zaloguj ponownie (#20.K4, EC10; L09)<br>s02.10 link weryfikacyjny wygasły lub błędny `?error=verification` (UI§/sign-in, EC16; L05)<br>s02.11 złe dane, komunikat ogólny (#21.K2, EC13)<br>s02.12 e-mail niezweryfikowany (EC15; L25)<br>s02.13 limit prób 429 (EC17; L11)<br>s02.14 usługa niedostępna 503: baza, bramka haszowania (EC18, EC31)<br>s02.15 już zalogowany: przekierowanie bez ekranu (EC28)<br>s02.16 wejście z `returnTo` po odmowie dostępu (UI§Guards, EC22)<br>~~s02.17 konto tylko GitHub, próba hasłem~~ zniesiony: scalony z s02.11 (L25) | #20.K1–K6, #21.K2, #22.K6 (przez returnTo) | `AuthLayout`, `AccountForm` (sign-in), `CrudForm`, `Button`, `AuthFeedback` (każdy stan błędu), `AccessStatus` `session-expired` |
| s03 | Rejestracja `/register` | Niezalogowany | s03.1 domyślny, GitHub pierwszy (#21.K1, #20.K5)<br>s03.2 wysyłanie, ładowanie (DS submitting)<br>s03.3 błędy pól 422: e-mail, hasło 12–72, nazwa 1–120 (SP `registerSchema`)<br>s03.4 konflikt: adres ma konto z hasłem 409 (SP macierz `registerWithPassword`)<br>s03.5 konflikt: adres powiązany z GitHubem 409 (#21.K3, EC14)<br>s03.6 limit 429 (EC17)<br>s03.7 usługa niedostępna 503 (EC18)<br>s03.8 błąd wysyłki maila 503 (EC29; L12)<br>s03.9 e-mail wyłączony, tylko GitHub (DS `emailDisabled`; UI§ nie opisuje, L18)<br>s03.10 już zalogowany (SP nie opisuje dla `/register`, L18) | #21.K1, #21.K3, #20.K5 | `AuthLayout`, `AccountForm` (register), `CrudForm`, `FormField`, `AuthFeedback` (`account-exists`, `github-account`, `rate-limited`, `service-unavailable`, `mail-unavailable`) |
| s04 | Sprawdź skrzynkę (po rejestracji) | Niezalogowany, po udanej rejestracji | s04.1 domyślny, adres z odpowiedzi `{ email }` (#21.K1; brak ekranu w SP, L04)<br>s04.2 ponowna wysyłka (L05)<br>s04.3 limit ponownej wysyłki 3/e-mail/godz. (SP Slice 4 pkt 23; L05)<br>s04.4 błąd wysyłki (EC29; L12) | #21.K1 | `AuthLayout`, `AuthFeedback` `check-inbox` lub `AccessStatus` `check-inbox`, `Button` |
| s05 | Ekran GitHub (atrapa zewnętrzna) | Niezalogowany. Tylko prototyp | s05.1 wybór odpowiedzi GitHuba (kontrolki prototypu, sekcja 2)<br>s05.2 oczekiwanie na odpowiedź do 10 s (EC7) | #20.K1–K3, EC2–EC8 | Spoza produktu: `Card`, `Button`, `Label` (atrapa) |
| s06 | Home mentee `/home` | Mentee. Mentor i operator mają go w nawigacji, jeśli trzymają też rolę mentee (L26) | s06.1 domyślny (#20.K1, #21.K1)<br>s06.2 pusty, nowe konto (brak treści w E01, L13; DS "No sessions yet")<br>s06.3 sprawdzanie sesji: nic z danych przed sprawdzeniem (#20.K4)<br>s06.4 sesja wygasła, przekierowanie do s02.9 (#20.K4, EC10)<br>s06.5 niezalogowany, przekierowanie do s02.16 (UI§Guards)<br>s06.6 nawigacja bez ścieżki "zostań mentorem" (#22.K5, R07; L32)<br>s06.7 baza niedostępna (EC31) | #20.K1, #21.K1, #22.K5, #20.K4 | `AppShell`, `Card`, `EmptyState`, `LoadingMessage`, `ErrorMessage`, nawigacja i "Sign out" (D1, D2) |
| s07 | Home mentora `/mentor` | Mentor (także mentor + operator, mentor + mentee) | s07.1 domyślny (#20.K2)<br>s07.2 pusty, nowy mentor (treść E02, L13)<br>s07.3 sprawdzanie sesji (#20.K4)<br>s07.4 sesja wygasła (#20.K4)<br>s07.5 niezalogowany (UI§Guards)<br>s07.6 mentee otwiera: odmowa, przejście do s10.1 (#22.K1, EC19)<br>s07.7 baza niedostępna (EC31) | #20.K2, #22.K1, #20.K4 | `AppShell`, `Card`, `EmptyState`, `LoadingMessage`, `ErrorMessage` |
| s08 | Home operatora `/admin` | Operator (allowlista). Tylko oni | s08.1 domyślny, także mentor + operator ląduje tu (#22.K3, #20.K7)<br>s08.2 sprawdzanie sesji (#20.K4)<br>s08.3 sesja wygasła (#20.K4)<br>s08.4 niezalogowany (UI§Guards)<br>s08.5 mentor bez operatora: odmowa, s10.2 (#22.K2, EC20)<br>s08.6 operator odwołany z allowlisty, odmowa przy następnym żądaniu (#22.K6, EC24; L10)<br>s08.7 operator dodany do allowlisty, dostęp bez ponownego logowania (EC25)<br>s08.8 baza niedostępna (EC31) | #22.K2, #22.K3, #22.K6, #20.K7 | `AppShell`, `Card`, `Badge` (role), `LoadingMessage`, `ErrorMessage` |
| s09 | Lista użytkowników `/admin/users` | Operator. Mentee, mentor i niezalogowany nie widzą | s09.1 domyślny, lista z danych demo (#22.K7 SP; kolumny L16)<br>s09.2 ładowanie (DS `DataTable`/`LoadingMessage`)<br>s09.3 pusty (praktycznie niemożliwy, founderzy istnieją; L16)<br>s09.4 błąd (DS `ErrorMessage`; EC31)<br>s09.5 odmowa nie-operatora, 403 (#22.K7)<br>s09.6 odwołany operator przechodzi klienckim routerem z `/admin` (#22.K6, EC21)<br>s09.7 sesja wygasła (#20.K4) | #22.K6, #22.K7, #20.K4 | `AppShell`, `DataTable`, `Badge`, `LoadingMessage`, `ErrorMessage`, `EmptyState`. Link "Users" musi zostać (Slice 3) |
| s10 | Brak dostępu | Zalogowany z niewłaściwą rolą (kto i dokąd: L10) | s10.1 mentee na ekranie mentora (#22.K1, EC19)<br>s10.2 mentor bez operatora na `/admin` (#22.K2, EC20)<br>s10.3 odwołany operator (#22.K6, EC21, EC24) | #22.K1, #22.K2, #22.K6 | `AccessStatus` `forbidden` lub `AuthFeedback` `forbidden` / `operator-revoked` (D4), `AppShell`, `Button` |

Uwagi do tabeli:
- Wszystkie ekrany poza s01, s02, s03, s04, s05 są "za strażnikiem": brak sesji przekierowuje do s02 z `returnTo`, zła rola przekierowuje do własnego home (UI§Guards). Czy s10 w ogóle istnieje jako ekran, jest otwartą luką L10.
- Nawigacja łączona: operator → `/admin`, potem mentor → `/mentor`, potem mentee → `/home` (priorytet `homeFor`), ale linki do wszystkich dozwolonych powierzchni zostają (UI§Role homes).
- Przepływ jedzie przez przekierowania, więc "ładowanie" stron wywoływanych przeglądarką (callback GitHuba) nie ma własnego ekranu poza s05.2.

## 2. Scenariusze do przełączania w prototypie

To kontrolki prototypu (pasek przeglądu), nie funkcje produktu.

| ID | Kontrolka | Wartości | Efekt | Źródło |
|---|---|---|---|---|
| p01 | Odpowiedź GitHuba (s05) | zgoda: nowe konto / zgoda: istniejące konto / zgoda: konto łączone z zweryfikowanym wierszem lokalnym | s06, s07 lub s08 wg konta; łączenie bez duplikatu | #20.K1, #20.K2, EC5 |
| p02 | Odpowiedź GitHuba | anulowanie (`access_denied`) | s02.4, brak konta | #20.K3, EC2 |
| p03 | Odpowiedź GitHuba | `state` niezgodny lub wygasły (>10 min) | s02.5 | EC6 |
| p04 | Odpowiedź GitHuba | GitHub 5xx / timeout 10 s | s02.6 (po s05.2) | EC7, EC8 |
| p05 | Odpowiedź GitHuba | brak zweryfikowanego głównego e-maila | s02.7 | EC3 |
| p06 | Odpowiedź GitHuba | e-mail pasuje do niezweryfikowanego konta | s02.8 | #20.K6, EC4 |
| p07 | Konfiguracja | brak danych GitHuba / `SESSION_SECRET` | s02.6 od razu po kliknięciu GitHub | EC1 |
| p08 | Link z maila | ważny / wygasły / nieprawidłowy / użyty ponownie | ważny: sesja i home; wygasły i błędny: s02.10; ponownie: bez błędu | EC16, #21.K1 |
| p09 | Następny request | OK / 503 / 429 z `retryAfterSeconds` / błąd wysyłki maila / baza niedostępna | s02.13–14, s03.6–8, s04.4, s06.7–s09.4. Zużywa się po jednym użyciu | EC17, EC18, EC29, EC31 |
| p10 | Wydanie "tylko GitHub" | włącz / wyłącz | s02.3, s03.9 | UI§/sign-in |
| p11 | Konflikty rejestracji | adres z hasłem / adres GitHub / adres niezweryfikowany | s03.4 / s03.5 / s04.1 (przejęcie wiersza) | macierz SP, #21.K3 |
| p12 | Sesja | "Wygaś teraz" | s02.9 z `returnTo` | #20.K4, EC10 |
| p13 | Operator | "Odbierz" / "Przywróć" dostęp Sam (allowlista) | s08.6, s09.6, s10.3 bez ponownego logowania; potem s08.7 | EC24, EC25 |
| p14 | Konto demo | wybór konta (tabela w sekcji 3) | wylogowanie i logowanie jako dane konto | #22.K1–K3 |
| p15 | `returnTo` | poprawny `/mentor` / wrogi `//evil.example`, `/api/…`, `/_next/…` | cel albo home roli | EC22 |
| p16 | Wylogowanie | z żywą sesją / z wygasłym ciasteczkiem | s01.2 w obu przypadkach | EC27 |
| p17 | Zalogowany otwiera `/sign-in` | tak | s02.15, przekierowanie | EC28 |
| p18 | Zegar demo | stały "teraz" (sekcja 3), przesuw o +24 h wygasza sesję | spójne z p12 | #20.K4 |

Nie robię kontrolek dla: wyścigu dwóch callbacków (EC9), rotacji sekretu (EC12), braku nagłówka CSRF (EC23), bramki haszowania jako osobnej kontrolki (EC18, łączę z 503 w p09), bo nie mają osobnego widocznego wyniku.

## 3. Konta i dane demo

Wszystko fikcyjne. Adresy w domenie `@devmentor.test` (konwencja ze specyfikacji). Hasło demo dla kont e-mail: `demo-haslo-12345` (spełnia 12–72).

| Konto | Role | Logowanie | Rola w testach |
|---|---|---|---|
| Alex Demo `alex@devmentor.test` | mentee | GitHub `alex-dev` | #20.K1, s06, #22.K1 |
| Nina Demo `nina@devmentor.test` | mentee | e-mail + hasło, zweryfikowany | #21.K1, #21.K2, s03.4 |
| Ada Lovelace `ada@devmentor.dev` (jak w seederze) | mentor | GitHub `ada` | #20.K2, s07, #22.K2 |
| Taylor Demo `taylor@devmentor.test` | mentee + mentor | GitHub `taylor` | łączone nawigacje, s07 |
| Founder A (demo) `founder-a@devmentor.test` | operator | GitHub `founder-a` | #22.K3, s08, s09 |
| Sam Demo `sam@devmentor.test` | mentor + operator | GitHub `sam-ops` | #20.K7, p13 (odwołanie, mentor zostaje) |
| Pat Demo `pat@devmentor.test` | brak konta: rejestracja e-mail | e-mail, niezweryfikowany po rejestracji | s03, s04, p08, p11 |
| Riley Demo `riley@devmentor.test` | mentee | tylko GitHub `riley-gh`, brak hasła | s03.5, s02.17 |
| Jo Demo `jo@devmentor.test` | brak | GitHub `jo-nomail`, bez zweryfikowanego e-maila | s02.7 |

Pominięte kombinacje ról: mentee + operator oraz wszystkie trzy (L26 pyta, czy w ogóle są dozwolone).

Dane z briefu użyte w E01: nazwa DevMentor, hasło "Text mentoring for developers" (z `AuthLayout`), sesje tekstowe 25 i 50 minut (D01, N01), start 1.0 w dniu 2026-10-31 (D16), operator to dwóch founderów (D19), mentorzy tylko z zaproszenia (D08, R07). **Ceny i terminy slotów z briefu nie istnieją** (brief nie podaje kwot ani widełek, patrz D09), a E01 ich nie potrzebuje, więc ich nie zmyślam.

Zegar demo: **2026-11-03 10:00 (wtorek), Europe/Warsaw (UTC+1)**, czyli tuż po starcie 1.0. Wynikają z niego: sesja ważna 24 h do 2026-11-04 10:00, ciasteczko `state` OAuth 10 min, okna limitów (logowanie 15 min, rejestracja 1 godz.). Strefa i TTL linku weryfikacyjnego nie są nigdzie określone (L22).

## 4. Luki w specyfikacji

Typy: **A** kryterium bez ekranu lub stanu, **B** stan potrzebny przepływowi bez kryterium, **C** sprzeczność, **D** decyzja, której nikt nie podjął. Decyzje wpisane po odpowiedziach właściciela produktu (wybrane przez agenta na polecenie "wybierz najlepsze odpowiedzi"). Specyfikacji, backlogu i design systemu nie zmieniam, więc rozbieżności zostają zapisane tu.

| ID | Typ | Luka | Pytanie do właściciela produktu | Decyzja |
|---|---|---|---|---|
| L01 | A | #21.K4 (mentor bez GitHuba akceptuje zaproszenie hasłem) i #20.K2 ("po zaproszeniu") zależą od akceptacji zaproszenia, której E01 nie obejmuje (SP: #15, backlog: #23). Nie ma ekranu ani stanu. | Czy prototyp E01 ma pokazać akceptację zaproszenia jako osobny ekran, czy zakładamy konta mentora już istniejące (tak jak w sekcji 3)? | Poza E01. Konta mentora istnieją z góry (sekcja 3), prototyp nie ma ekranu zaproszenia. #21.K4 i akceptacja zaproszenia zostają w E02-S01 (#23). |
| L02 | A | #22.K4 (mentee widzi tylko swoje sesje) nie ma ekranu: spec wprost mówi, że w E01 nie ma listy z zakresem. | Czy #22.K4 przenosimy do historii z listą sesji (#31) i usuwamy z E01? | Poza prototypem E01: nie ma listy sesji. Kryterium #22.K4 zostaje w historii z listą sesji (#31). Zmiany backlogu tu nie robimy. |
| L03 | A | #22.K3 (founderzy mają operatora): żaden ekran nie pokazuje, kto jest operatorem. | Czy ktokolwiek ma zobaczyć swoją rolę (np. w `AppShell`), czy rola widać tylko z dostępu do `/admin`? | Rola nie ma osobnego wskaźnika. Operatora widać po dostępie do `/admin` i linku Users. |
| L04 | B | Po rejestracji odpowiedź to tylko `{ email }`. Ekranu "sprawdź skrzynkę" spec nie opisuje, a #21.K1 wymaga potwierdzenia adresu. | Czy ekran "sprawdź skrzynkę" jest w E01 i jaki ma tekst oraz akcje? | Tak. s04 pokazuje `check-inbox` z adresem w `detail` i akcją "Send another email". |
| L05 | B | Wygasły link ma dać "sposób na poproszenie o kolejny" (UI§), jest limit 3 ponowne wysyłki/e-mail/godz. (Slice 4), ale nie ma trasy API, schematu ani stanów. DS mówi inaczej: ponowna wysyłka to powtórzenie rejestracji (`E01Flow.mdx`). Nie wiadomo też, co z już zweryfikowanym adresem (wyciek istnienia konta). | Jak użytkownik prosi o nowy link (osobna akcja czy ponowna rejestracja), co widzi po wysłaniu i po przekroczeniu limitu, i co dla adresu już zweryfikowanego? | Osobna akcja "Send another email" na s04 i s02.10, nie ponowna rejestracja. Odpowiedź zawsze ta sama, niezależnie od stanu adresu. Po wysłaniu `check-inbox` z `detail`, po limicie s04.3. Trasy API w specyfikacji brak, wpisać do specyfikacji osobno. |
| L06 | C | Spec: poprawny link weryfikacyjny przekierowuje od razu do home z sesją. DS i prototyp (`E01Flow.mdx`) mają osobny ekran "Email verified" z przyciskiem "Open my workspace". Ponadto: czas życia linku nie jest podany, a ponowne użycie jest "idempotentne" bez opisu, co widzi użytkownik (zalogowany jako ktoś inny, niezalogowany). | Który wariant jest właściwy, jaki jest czas życia linku i co widzi osoba otwierająca użyty link? | Wariant specyfikacji: poprawny link daje sesję i przenosi od razu do home, bez ekranu "Email verified". Link żyje 24 h (założenie demo). Ponownie użyty link nie jest błędem: prowadzi do s02 z `verified` i prośbą o logowanie. |
| L07 | B | EC3 (GitHub bez zweryfikowanego e-maila) i EC4 (konflikt z niezweryfikowanym kontem) są odmowami "z wyjaśnieniem", ale tabela `?error=…` w UI§ zna tylko `cancelled`, `state`, `unavailable`, `verification`. Brak nazw i treści dla tych dwóch. DS ma `github-email` i `github-link`. | Czy używamy tekstów DS, i jakie wartości `?error=` mają te dwa stany? | Teksty DS `github-email` (s02.7) i `github-link` (s02.8). Wartości `?error=github-email` i `?error=github-link`. |
| L08 | C | `?error=unavailable` służy jednocześnie dla "GitHub nieskonfigurowany" (EC1) i awarii GitHuba (EC7, EC8). Tekst w spec: "GitHub sign-in is not configured yet", w DS: "Try again later". Dla awarii pierwszy jest mylący. | Jeden stan z jednym tekstem, czy dwa różne? | Dwa stany: awaria GitHuba używa `github-unavailable` (spróbuj później), brak konfiguracji `method-unavailable`. Oba z `?error=unavailable`, różnią się tekstem. |
| L09 | B | Wygasła sesja (#20.K4): spec przekierowuje na `/sign-in`, ale nie przekazuje powodu (brak `?error=` dla sesji), więc nie wiadomo, skąd ekran ma wiedzieć, że ma napisać "Your session has expired". Nie opisano też, czy po zalogowaniu GitHubem wraca się do `returnTo`. | Czy ekran logowania ma powiedzieć, że sesja wygasła (jak: parametr, ciasteczko), czy wystarczy zwykły formularz? | Tak. s02.9 pokazuje `session-expired` z `AuthFeedback`. Przekazanie powodu to szczegół implementacji. Po logowaniu powrót do `returnTo`. |
| L10 | D | Zła rola: spec mówi "przekierowanie do własnego home" (EC19, EC20), DS ma komunikat `forbidden` i `operator-revoked`, a #22.K1/K2 mówią "odmowa i przekierowanie". Nie wiadomo, czy s10 w ogóle istnieje, czy komunikat pokazuje się na ekranie docelowym i jak jest przekazany przez przekierowanie. Dla odwołanego operatora (EC21, EC24) "Refused" bez celu: mentor/mentee home? | Czy zła rola pokazuje komunikat, czy tylko przekierowuje? Dokąd trafia odwołany operator? | Zła rola: przekierowanie do własnego home i jednorazowy `forbidden` nad treścią. s10 nie jest osobną trasą, to ten komunikat (ID zostaje dla komentarzy). Odwołany operator trafia do home swoich pozostałych ról z `operator-revoked`. |
| L11 | B | 429: spec daje `retryAfterSeconds`, a DS tylko tekst "try again shortly". Nie wiadomo, czy formularz się blokuje, czy jest odliczanie i czy limit logowania per e-mail mówi, że chodzi o ten adres (spec zabrania ujawniania). | Czy pokazujemy czas oczekiwania i blokujemy formularz? | Pokazujemy `rate-limited` z czasem w `detail` ("Try again in 15 minutes"), wpisy zostają, bez wzmianki o adresie. Prototyp nie liczy czasu naprawdę. |
| L12 | C | Błąd wysyłki maila (EC29): spec mówi "rejestracja się nie udaje, żaden sukces", ale macierz zapisuje `password_hash` natychmiast, więc konto już istnieje niezweryfikowane. DS mówi "Your account is waiting for verification". | Co użytkownik ma uznać za stan konta po takim błędzie i co ma kliknąć dalej? | Konto istnieje, niezweryfikowane. Pokazujemy `mail-unavailable` z akcją "Try again", która ponawia rejestrację (przejęcie wiersza). |
| L13 | D | Treść homów `/home`, `/mentor`, `/admin` w E01 to "minimalne". DS pokazuje "No sessions yet" (funkcja E03). Nie wiadomo, co jest na ekranie nowego mentee, mentora i operatora. | Co dokładnie widzi nowy mentee, nowy mentor i operator w E01? | Minimalnie. Każdy home: nagłówek z imieniem i pusty stan. Mentee: "No sessions yet" (tekst DS). Mentor: pusty stan bez obietnic. Operator: link Users. |
| L14 | D | Strona `/` jest celem wylogowania, ale E01 nie mówi, co na niej jest, czy zalogowany jest przekierowywany, czy jest tam komunikat "You are signed out" (DS `signed-out`) i skąd prowadzi do logowania. | Jaką rolę pełni `/` w E01 i czy po wylogowaniu coś ma się pokazać? | `/` prosta: nazwa, hasło "Text mentoring for developers", link "Sign in". Po wylogowaniu `signed-out`. Zalogowany nie jest przekierowywany. |
| L15 | D | Nawigacja per rola: znany jest tylko link "Users" (operator). Linki mentee i mentora w E01 nie istnieją poza home. | Jakie pozycje nawigacji ma każda rola w E01? | Mentee: Home. Mentor: Mentor home (i Home, jeśli ma rolę mentee). Operator: Admin home i Users. Każdy tylko dla swoich ról. |
| L16 | D | `/admin/users`: spec mówi "shape unchanged" bez kolumn, paginacji, widoku roli i stanów pustego, ładowania, błędu. Lista pokazuje e-maile i być może identyfikatory GitHuba. | Jakie kolumny i które dane osobowe widzi operator? Czy ma być pole z rolami? | Kolumny: Display name, Email, Roles (`Badge`). Bez identyfikatora GitHuba i bez paginacji (9 rekordów demo). Stany ładowania i błędu z DS. |
| L17 | B | Rejestracja e-mailem zbiera `displayName`, GitHub tworzy konto bez tego kroku, a `AppShell` pokazuje "Signed in as {displayName}". Skąd imię przy GitHubie? | Czy bierzemy nazwę z GitHuba, a jeśli jej nie ma, to co? | Imię z GitHuba, a gdy go brak, login GitHuba. |
| L18 | B | `UI§` opisuje tylko `/sign-in`. Brak stanów `/register`: czy ma przycisk GitHub, link między logowaniem a rejestracją, co przy zalogowanym użytkowniku. | Czy `/register` ma takie same stany i zachowania jak `/sign-in` (GitHub pierwszy, przekierowanie zalogowanego)? | `/register` ma te same zasady co `/sign-in`: GitHub pierwszy, link do logowania, zalogowany jest przekierowany do home. |
| L19 | D | Reset hasła jest poza zakresem ("not in the brief"). Użytkownik, który zapomniał hasła, nie ma żadnej ścieżki, a ekran logowania nie mówi, co zrobić. | Czy ekran logowania ma wskazać GitHub jako wyjście, czy zostawiamy bez wzmianki i bez linku? | Bez linku i bez tekstu o resecie (poza zakresem). Nie dodajemy. |
| L20 | D | Wylogowanie kończy wszystkie sesje użytkownika (decyzja "global logout"), ale UI nie mówi o tym. Nie opisano też potwierdzenia ani komunikatu po wylogowaniu. | Czy użytkownik ma wiedzieć, że wylogowuje się wszędzie? | Bez potwierdzenia i bez informacji o globalnym wylogowaniu. Wylogowanie od razu prowadzi do s01.2. |
| L21 | B | Sesja wygasa na już otwartej stronie, w trakcie akcji (API zwraca 401). `apiCall` jest jedynym miejscem `fetch`, ale zachowanie przy 401 nie jest opisane. | Co widzi użytkownik, gdy sesja wygasa w trakcie akcji: przekierowanie, czy komunikat na miejscu? | Przekierowanie do s02.9 z `returnTo`, tak jak przy #20.K4. |
| L22 | D | Brak: strefy czasowej produktu, czasu życia linku weryfikacyjnego, tekstów o czasie (np. kiedy sesja wygasa). Guidelines DS wymagają strefy przy datach. | Jaka strefa jest domyślna i jaki TTL ma link weryfikacyjny? | Strefa Europe/Warsaw, daty z nazwą strefy. Link weryfikacyjny 24 h (jak L06). |
| L23 | C | Spec nagłówek: epik #7, historie #12–14. Backlog: epik #15, historie #20–22. DS (`E01Flow.mdx`, `Gaps.mdx`) linkuje do `open-mercato/ai_techleaders_project#12–14` i mapuje inne numery (np. #20 = Directory). | Których numerów używamy w prototypie i komentarzach i czy aktualizujemy spec i dokumentację DS? | Używamy numerów backlogu: epik #15, historie #20, #21, #22. Specyfikacji i dokumentacji DS nie zmieniamy, rozbieżność zostaje do osobnej poprawki. |
| L24 | C | Etykieta: #20.K1 i spec "Sign in with GitHub", DS `AccountForm` "Continue with GitHub". | Który tekst przycisku? | Docelowo "Sign in with GitHub" (zgłoszenie i spec). Prototyp zostaje z "Continue with GitHub" z DS, bo DS nie zmieniamy. Rozbieżność odnotowana. |
| L25 | C | Spec wymaga ogólnego błędu logowania (EC13, standardy: nie ujawniać, czy e-mail jest zarejestrowany). EC15 odmawia "z powodem" niezweryfikowanemu. DS ma `unverified-email` i `github-account` (ujawniają stan konta) w logowaniu. Spec dopuszcza ujawnienie tylko na rejestracji. | Czy w logowaniu zostają stany `unverified-email` i `github-account`, czy każde jest ogólnym błędem? | Logowanie ogólne: s02.11 dla nieznanego e-maila, złego hasła i konta tylko GitHub. s02.17 zniesiony (scalony z s02.11). s02.12 zostaje wg EC15. |
| L26 | C | "Nowe konto dostaje mentee, zaproszenie dodaje mentor bez usuwania" vs kryteria "mentor-only". Czy mentor trzyma też rolę mentee (i `/home` jest mu dostępny)? Czy kombinacje mentee + operator i wszystkie trzy są dozwolone? | Jakie zestawy ról są poprawne i czy mentor nadal ma s06? | Dozwolony każdy niepusty zestaw ról (spec). Nowe konto ma mentee, zaproszenie dodaje mentor. `/home` wymaga roli mentee. Konta demo bez zmian. |
| L27 | C | Spec: "72-bajtowy limit", ale `z.string().max(72)` liczy znaki, nie bajty. DS `E01Flow.mdx` mówi "at most 72 bytes", a `AccountForm` podpowiada tylko minimum 12. | Czy komunikat i walidacja mają mówić o bajtach, i czy pokazujemy maksimum w podpowiedzi? | Walidacja w bajtach (`TextEncoder`), błąd "Use at most 72 bytes". Podpowiedź w polu tylko o minimum 12, jak w DS. Poprawka schematu to sprawa specyfikacji. |
| L28 | C | Spec i AGENTS.md: strony `(auth)` to publiczny Tailwind, `AppShell` to shadcn. DS `AuthLayout`/`AccountForm` są zbudowane na własnych klasach `dm-*`. | Czy w prototypie używamy `AuthLayout`/`AccountForm` z DS, czy spec ma się dostosować? | Prototyp używa `AuthLayout` i `AccountForm` z DS. Rozbieżność z AGENTS.md zgłoszona, nic nie zmieniamy. |
| L29 | C | Brief N02 (brak ocen i recenzji) vs DS: `MentorReviews` i oceny dodane na prośbę z 7 września. Poza E01, ale komponenty mogą trafić do prototypu. | Czy komponenty ocen mają być ukryte, usunięte, czy zostają? | Komponenty ocen nie wchodzą do prototypu E01 (poza przepływem, N02). |
| L30 | D | Istnieje wcześniejszy prototyp `prototypes/devmentor-journey` z ID `s1`–`s25` (np. `s12` = logowanie) i z własnymi scenariuszami. Mapa używa nowych ID `s01`–`s10`. | Czy zastępujemy istniejący prototyp, czy budujemy obok i jak łączymy ID? | Nowy prototyp w `prototypes/konta-i-role/` z ID s01–s10. Istniejący `devmentor-journey` zostaje bez zmian. Mapowanie ID niepotrzebne. |
| L31 | D | Operator = zweryfikowany e-mail z `OPERATOR_EMAILS`. Founder rejestrujący się e-mailem i hasłem (po weryfikacji) też dostaje operatora. Spec mówi o tym tylko wśród zmian e-mail GitHuba (EC26). | Czy operator może logować się hasłem, czy tylko GitHubem? | Operator = zweryfikowany e-mail z allowlisty, dowolną metodą logowania (spec). Prototyp: konta operatorskie logują się GitHubem. |
| L32 | D | R07 (brak drogi do zostania mentorem). Nie wiadomo, czy mentee ma gdziekolwiek przeczytać, że mentorzy dołączają tylko na zaproszenie. | Czy jest jakikolwiek tekst o zaproszeniach dla mentee, czy brak jakiejkolwiek wzmianki? (Nie dodaję go bez decyzji.) | Żadnego tekstu o zaproszeniach dla mentee. Brak drogi i brak wzmianki. |

## 5. Luki w design systemie

| ID | Luka | Decyzja |
|---|---|---|
| D1 | Brak komponentu pozycji nawigacji (link z aktywnym stanem) dla slotu `nav` w `AppShell`. `AppShell` przyjmuje tylko `ReactNode`. | Zwykłe linki w slocie `nav`, bez nowego komponentu. Brak zgłoszony do DS. |
| D2 | Brak `WorkflowAction` (spec: wylogowanie to "pierwsza `WorkflowAction`"). W `packages/ui` takiego komponentu nie ma. | Zwykły `Button` w slocie `actions` topbara. |
| D3 | `AuthFeedback` `rate-limited` nie ma odliczania ani wstawki `retryAfterSeconds`, tylko ogólny tekst i slot `detail` (L11). | Czas wstawiamy w slot `detail`. |
| D4 | `AccessStatus` i `AuthFeedback` mają zdublowane stany (`session-expired`, `forbidden`, `check-inbox`). Brak decyzji, który jest dla którego ekranu (s02, s04, s10). | `AuthFeedback` wszędzie w E01. `AccessStatus` nie używamy. |
| D5 | Brak stanów w `AuthFeedback`: "wysłano ponownie", "limit ponownej wysyłki", "link już użyty", "już zalogowany" (L05, L06). | Obejście: `check-inbox` z `detail`, `verified` dla użytego linku, "już zalogowany" to przekierowanie. |
| D6 | Brak kompozycji strony głównej `/` i homów ról (powitanie, pusty home mentee, mentora, operatora) (L13, L14). | Złożenie z `Card`, `EmptyState` i `AppShell` w prototypie, bez nowego komponentu. |
| D7 | Brak kompozycji ekranu "brak dostępu" w `AppShell` (s10 w `AuthLayout` czy wewnątrz powłoki?). | Komunikat `forbidden` w `AppShell` nad treścią home (L10). |
| D8 | Etykieta GitHub (L24) i klasy `dm-*` vs Tailwind (L28) wymagają jednego rozstrzygnięcia po stronie DS. | Zgodnie z L24 i L28: bez zmian w DS. |
| D9 | Brak atrapy ekranu GitHuba i pola wyboru wyników do prototypu. Ma je pasek przeglądu w `lekcja-07/silnik-przegladu` (do potwierdzenia przy budowie). | Pasek przeglądu z `lekcja-07/silnik-przegladu`. |
| D10 | Dokumentacja DS (`E01Flow.mdx`, `Gaps.mdx`) odsyła do starych numerów zgłoszeń (L23) i do istniejącego prototypu o innych ID (L30). | Bez zmian, odnotowane (L23, L30). |

## 6. Liczby

Wartości policzone skryptem z tego pliku:

- Ekrany: **10** (s01–s10), w tym 1 atrapa zewnętrzna (s05), czyli **9** ekranów produktu.
- Stany: **67** zdefiniowanych, **1** zniesiony (s02.17, L25), czyli **66** aktywnych (s01: 2, s02: 16, s03: 10, s04: 4, s05: 2, s06: 7, s07: 7, s08: 8, s09: 7, s10: 3). ID s02.17 zostaje zarezerwowane i nie jest używane ponownie.
- Scenariusze do przełączania: **18** (p01–p18).
- Konta demo: **9**.
- Luki w specyfikacji: **32** (A: 3, B: 8, C: 10, D: 11). Z decyzją: **32**, otwartych: **0**. Decyzje, które wymagają osobnej poprawki specyfikacji, backlogu lub DS (nie robimy jej tutaj): L02, L05, L06, L23, L24, L27, L28.
- Luki w design systemie: **10**, wszystkie z decyzją (obejście w prototypie, bez zmian w DS).
- Kryteria: 18 (14 ze zgłoszeń, 4 tylko ze specyfikacji). Bez ekranu: 2 (#21.K4, #22.K4).

---

Mapa zatwierdzona. Kolejny krok to prototyp (`klikalny-prototyp-devmentor.txt`).
