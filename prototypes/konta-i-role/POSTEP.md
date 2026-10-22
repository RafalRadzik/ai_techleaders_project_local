# Postęp: prototyp Epiku 01 (konta i role)

Źródła: `lekcja-07/mapa-ekranow.md` (zatwierdzona 2026-10-22), `.ai/specs/2026-09-04-accounts-and-roles.md`,
szary prototyp `.ai/prototypes/discovery/mentor-onboarding/revision-001` (brak nowszej wersji), silnik `lekcja-07/silnik-przegladu/`.
Wynik budowania: `packages/ui/.storybook/public/prototypes/konta-i-role/` (URL `/prototypes/konta-i-role/index.html`), ukryty w `.git/info/exclude`, nie do commita.

Budowanie: `node prototypes/konta-i-role/build.mjs` (z katalogu głównego repo).
Typy: `npx tsc --noEmit --project prototypes/konta-i-role/tsconfig.json`.
Testy: `npx vitest run --config prototypes/konta-i-role/vitest.config.mts`.

- [x] Etap 0. Plan
- [x] Etap 1. Szkielet i ścieżka bez błędów
- [x] Etap 2. Stany, role i scenariusze
- [x] Etap 3. Uczciwość i sprawdzenie (gotowe, czeka na odbiór raportu)

## Decyzje
- Zaproszenie z szarego prototypu: bez ekranu (mapa L01); wzięte reguły logowania (A8, R06, R07, D07).
- Ekrany s01–s10 i ID z mapy bez zmian. Interfejs po angielsku (AGENTS.md), pasek przeglądu też.
- Wynik budowania ukryty lokalnie (`.git/info/exclude`), `.gitignore` bez zmian.

## Etap 1: zrobione
- Silnik przeglądu skopiowany bez zmian (`prototype.js`, `prototype.css`); `comments.js` z `prototypeId: 'konta-i-role'`; `mostek.css` mapuje na tokeny `--dm-*`.
- Pasek przeglądu: wybór ekranu, motyw, „Prototype”, panel „Scenarios” (konto GitHub p01 częściowo, zmiana konta p14, reset), „Screen map”.
- Ekrany ścieżki: s01, s02.1, s03.1, s04.1, s05.1, s06.1, s07.1, s08.1, s09.1 oraz prosty s10.1 i prosta bramka (do zastąpienia w Etapie 2).
- Atrapa API formularzy przez msw (`runtime.ts`), model w `model.ts` (7 testów przechodzi).

## Luki w DS użyte w kodzie
- D1: linki w slocie `nav` (`WorkspaceNav` w `Screens.tsx`), D2: `Button` zamiast `WorkflowAction`. Komentarze `GAP Dn` do dopisania w Etapie 3.

## Pytania do specyfikacji (z budowy)
- s09 pokazuje tylko istniejące konta (6 na starcie, rośnie po rejestracji); mapa mówi „9 rekordów demo”.

## Etap 2: zrobione
- Architektura: `controller.ts` (strażnicy, przekierowania, powiadomienia, wyniki scenariuszy; bez Reacta, testowalny), `backend.ts` (symulowane konta i sesja), `scenario.ts` (ustawienia paska przeglądu), `runtime.ts` (atrapa API formularzy przez msw).
- Stany: wszystkie z mapy osiągalne kliknięciem albo kontrolką. Aktualny numer stanu widać w nagłówku ekranu ("State s02.4").
- Kontrolki p01–p18 w panelu „Scenarios” plus p19 (pusta lista użytkowników, dodana przez budowę, bo s09.3 inaczej nieosiągalny).
- Bramki: brak sesji → s02.16, sesja wygasła → s02.9, zła rola → s10 (komunikat nad własnym home, decyzja L10), odwołany operator → s10.3.
- Dane wpisane w formularzach zostają po każdym błędzie (formularz nie jest odmontowywany).
- Testy: `model.test.ts` + `controller.test.ts` (37 testów, przechodzą).

## Decyzje i luki z Etapu 2
- Błędy formularzy: atrapa zwraca pusty `message`, więc widać tylko `AuthFeedback` (bez dubla z `CrudForm`).
- Brak w DS: stanu `method-unavailable` (L08) → użyto `github-unavailable` z opisem „not configured yet”; komunikatu „zaloguj się, aby otworzyć stronę” (s02.16) → tekst w opisie `AuthLayout`.
- s05 „Authorize” wykonuje odpowiedź GitHuba wybraną w pasku (p01–p06); „Cancel” zawsze daje s02.4.
- s06.2/s07.2: wariant „Welcome” przy pierwszej wizycie konta w tej sesji; s08.7 to udane wejście po przywróceniu.
- s02.15/s03.10: przekierowanie bez ekranu (sterowane przyciskiem p17 i wyborem ekranu).

## Etap 3: zrobione
- Notatki pod każdym ekranem (historie, symulacje, co nierozstrzygnięte), komentarze `GAP` w kodzie, README z sekcją „Ograniczenia symulacji”.
- Testy: 48 (model, kontroler, nawigacja między ekranami, brak martwych przycisków w jsdom). `tsc` czysty.
- Przeglądarka (agent-browser): 1440 i 320 px, jasny i ciemny motyw, brak przepełnienia poziomego; klawiatura (kolejność Tab, Enter, fokus na nagłówku po załadowaniu strony chronionej); przegląd 31 przycisków i wszystkich kontrolek panelu.
- Zmiany po przeglądzie: pasek nie jest przyklejony poniżej 760 px, `scroll-padding-top`, fokus na nagłówku po sprawdzeniu sesji.
