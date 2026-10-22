# Prototyp klikalny: Epik 01, konta i role

Klikalny prototyp przepływu z zatwierdzonej mapy ekranów (`lekcja-07/mapa-ekranow.md`, ekrany `s01` do `s10`). Pokazuje wygląd i zachowanie logowania, rejestracji i dostępu według ról, zanim powstanie kod produkcyjny. Dla właściciela produktu albo klienta: klika i komentuje. Dla developera: widzi, jak ekrany składają się z komponentów `@devmentor/ui`.

Prototyp nie jest importowany przez aplikację. Nie zmienia kodu aplikacji ani design systemu.

## Jak uruchomić

Z katalogu głównego repozytorium:

```bash
node prototypes/konta-i-role/build.mjs   # buduje do packages/ui/.storybook/public/prototypes/konta-i-role/
npm run storybook                        # serwuje ten katalog
```

Prototyp otwiera się pod `/prototypes/konta-i-role/index.html` (w podglądzie sandboxa: port 3000). Wynik budowania nie jest kodem design systemu i nie idzie do commita (lokalnie ukryty w `.git/info/exclude`). Prototyp trzeba otwierać z serwera, nie z `file://`, bo atrapa API korzysta z service workera `/mockServiceWorker.js`.

Sprawdzenie:

```bash
npx tsc --noEmit --project prototypes/konta-i-role/tsconfig.json
npx vitest run --config prototypes/konta-i-role/vitest.config.mts
```

## Jak komentować

Pasek przeglądu na górze: **Comment** włącza tryb komentarzy (kliknięcie przypina uwagę do elementu), **Presentation** pokazuje jeden ekran naraz, **Screen map** otwiera mapę ekranów, **← Back** wraca do poprzedniego ekranu. Komentarze zapisują się w przeglądarce recenzenta. **Threads → Export for repository** daje nowy `comments.js` do commita, **Export Markdown** daje `prototype-feedback.md`. `prototypeId` to `konta-i-role`. Szczegóły: `lekcja-07/silnik-przegladu/README.md`.

## Ekrany

| ID | Ekran | Historie |
|---|---|---|
| s01 | Strona główna | cel wylogowania |
| s02 | Logowanie | #20, #21 |
| s03 | Rejestracja | #21 |
| s04 | Sprawdź skrzynkę | #21 |
| s05 | GitHub (atrapa, nie ekran produktu) | #20 |
| s06 | Home mentee | #20, #21, #22 |
| s07 | Home mentora | #20, #22 |
| s08 | Home operatora | #20, #22 |
| s09 | Lista użytkowników | #22 |
| s10 | Brak dostępu (komunikat nad własnym home, decyzja L10) | #22 |

W nagłówku każdego ekranu widać numer bieżącego stanu (np. `State s02.4`), a pod ekranem notatka: historie, co jest symulacją, czego prototyp nie rozstrzyga. Zaproszenie mentora i akceptacja zaproszenia są poza zakresem (L01).

## Konta demo

Wszystkie dane są fikcyjne, adresy w domenie `@devmentor.test`. Hasło kont z e-mailem: `demo-haslo-12345`. Zegar demo: wtorek 2026-11-03, 10:00 Europe/Warsaw.

| Konto | Role | Logowanie |
|---|---|---|
| Alex Demo `alex@devmentor.test` | mentee | GitHub `alex-dev`, konto powstaje przy pierwszym logowaniu |
| Nina Demo `nina@devmentor.test` | mentee | e-mail i hasło |
| Ada Lovelace `ada@devmentor.dev` | mentor | GitHub `ada` |
| Taylor Demo `taylor@devmentor.test` | mentee i mentor | GitHub `taylor` |
| Founder A (demo) `founder-a@devmentor.test` | operator | GitHub `founder-a` |
| Sam Demo `sam@devmentor.test` | mentor i operator | GitHub `sam-ops` |
| Pat Demo `pat@devmentor.test` | rejestruje się e-mailem | po weryfikacji linkiem |
| Riley Demo `riley@devmentor.test` | mentee | tylko GitHub `riley-gh`, bez hasła |
| Jo Demo `jo@devmentor.test` | brak | GitHub `jo-nomail`, bez zweryfikowanego e-maila |

Konto można zmienić w panelu **Scenarios** (p14) albo zalogować się normalnie.

## Scenariusze (panel Scenarios)

Kontrolki są osobno od nawigacji produktu. „Next request” działa raz i sam wraca do „Works normally”.

| ID | Kontrolka | Co daje |
|---|---|---|
| p01 do p06 | GitHub demo account i GitHub response | zgoda (nowe konto, istniejące, łączenie ze zweryfikowanym), anulowanie, błędny `state`, błąd lub timeout, brak zweryfikowanego e-maila, e-mail pasuje do niezweryfikowanego konta |
| p07 | GitHub setup | „Not configured” daje s02.6 po kliknięciu GitHub |
| p08 | Verification link | link ważny, wygasły, nieprawidłowy, użyty ponownie |
| p09 | Next request | 503, 429, błąd wysyłki e-maila, baza niedostępna (formularze, ponowna wysyłka, wejście na strony chronione) |
| p10 | Release | „GitHub only” wyłącza formularze e-mail (s02.3, s03.9) |
| p11 | Fill registration | wypełnia rejestrację adresem z hasłem, z GitHubem albo niezweryfikowanym |
| p12 | Expire session now | sesja wygasa, następne żądanie daje s02.9 |
| p13 | Sam's operator access | Revoke i Restore bez ponownego logowania |
| p14 | Switch demo account | zmiana konta |
| p15 | Return target | cel po przekierowaniu: właściwa strona albo wrogi `//evil.example` (wraca na home roli) |
| p16 | opis w panelu | wylogowanie z wygasłą sesją kończy się tak samo jak z żywą: s01.2 |
| p17 | Open /sign-in | zalogowany jest przekierowany do swojego home |
| p18 | Advance clock 24 h | sesja wygasa od zegara |
| p19 | Users list | pusta lista użytkowników (s09.3); kontrolka dodana przez budowę, bo inaczej stanu nie da się osiągnąć |

## Ograniczenia symulacji

- Nic tu nie jest prawdziwą usługą. Logowanie GitHubem, e-mail i hasła są symulowane w przeglądarce. Żaden e-mail nie wychodzi, GitHub nie jest kontaktowany, nic nie jest zapisywane ani wysyłane. Wpisuj tylko fikcyjne dane.
- Konta, sesja i role żyją w pamięci strony. Odświeżenie strony wraca do stanu początkowego („Reset simulation” robi to samo bez odświeżania).
- Ekran GitHuba (s05) i „skrzynka” na s04 to atrapy. Limit czasu GitHuba (10 s) jest skrócony do kilku sekund.
- Limity (429) i odliczanie nie liczą czasu. Tekst „Try again in 15 minutes” jest stały. Limit ponownej wysyłki (3 na godzinę) liczy wysłania w danej wizycie.
- Sesja nie ma ciasteczek ani podpisu. Wygasanie to porównanie z zegarem demo. Kontrole dostępu w prototypie nie są zabezpieczeniem.
- Stan strony jest „stary” do następnego żądania: po odwołaniu operatora nawigacja zmienia się dopiero po wejściu na kolejną stronę. To odwzorowanie reguły ze specyfikacji, nie błąd.
- Zaproszenia mentorów, listy sesji (#22 K4) i nadawanie ról nie są w prototypie (L01, L02, L03).
- Przycisk „Continue with GitHub” używa etykiety z design systemu. Zgłoszenie i specyfikacja mówią „Sign in with GitHub” (L24).
- Interfejs jest po angielsku (AGENTS.md), łącznie z paskiem przeglądu.

## Luki w design systemie, obejścia w kodzie (oznaczone `GAP`)

D1 brak komponentu pozycji nawigacji (zwykłe linki w slocie `nav`), D2 brak `WorkflowAction` (zwykły `Button`), D3 brak odliczania w `rate-limited` (czas w `detail`), D4/D7 komunikat odmowy jako `AuthFeedback` nad home, D5 brak stanu „wysłano ponownie” (`check-inbox` z `detail`), D6 brak kompozycji stron głównych (`Card` i `EmptyState`), L08 brak `method-unavailable` (`github-unavailable` z `detail`), brak stanu „zaloguj się, aby kontynuować” (tekst w opisie `AuthLayout`).

## Pliki

`index.html`, `main.tsx` (start), `Screens.tsx` (ekrany), `ReviewBar.tsx` (pasek przeglądu i scenariusze), `controller.ts` (przepływy, bramki, stany), `backend.ts` i `model.ts` (symulowane konta), `scenario.ts` (ustawienia paska), `runtime.ts` (atrapa API), `styles.css`, `mostek.css` (tokeny dla silnika), `prototype.js`, `prototype.css`, `comments.js` (silnik przeglądu), `POSTEP.md` (postęp prac), `*.test.ts(x)` (testy).
