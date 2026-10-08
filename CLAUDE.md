# Humanverse v3: kontekst dla Claude

Projektujemy i prototypujemy nową stronę Humanverse (następca websitev2-opal.vercel.app). Odpowiadaj po polsku. Pracuj jak top projektant www: dopracowany wygląd, ale bez przesady.

## Zasady od właściciela
- Tam, gdzie się da, deleguj proste zadania słabszym subagentom (sonnet, haiku): wyciąganie danych, tłumaczenia, CSS według dokładnej specyfikacji, przegląd zrzutów ekranu. Decyzje projektowe, silnik siatki i weryfikację rób sam.
- Styl jak w decku partnerskim w Figmie: https://www.figma.com/slides/OVvZAYUtHpTEm0fTattBj6 . Ogromne dwukolorowe nagłówki w Barlow Condensed 800 wersalikami, tekst w Space Grotesk, fiolet #4C02E8, zieleń #00CC66, biel; AlterCast #FBAA19 + biel + #231F20.
- Humanverse to „kompletny pakiet kreatywny AI dla marketingu”, a nie agencja. Kreacja to „Inside every production”: nadzór nad pomysłem, scenariuszem i lookiem, audyt pomysłów agencji i klienta, dopracowanie kreacji pod pipeline i AI.
- AlterCast to osobna spółka. Humanverse tylko rozwija jej technologię. Nie pokazujemy zespołu AlterCast ani zespołu DEV.
- Deck jest dla partnerów, a strona publiczna: żadnych tajemnic (plany sprzedażowe i rynkowe, wyceny, wyniki, partnerzy AlterCast, niezapowiedziane produkty, wielkość zespołu dev, narzędzia wewnętrzne). Pokazujemy podejście do biznesu i etykę.
- Repozytorium jest publiczne: nie commituj zdjęć ludzi. Zdjęcia są lokalnie w paczce `humanverse-v3-ze-zdjeciami` (folder `img/` i `photos.json`), poza repozytorium.

## Struktura
- `docs/PLAN.md`: plan strony (sekcje, system wizualny, przejścia, technologia, otwarte kwestie). Aktualizuj go razem ze zmianami.
- `prototype/src/`: źródła. `body.html` (markup z angielskim tekstem), `pl.json` (polskie teksty), `extra-en.json` (angielskie teksty używane tylko z JS), `styles.css`, `app.js` (języki, panel konceptu, formularz, menu), `work.js` (siatka realizacji i nakładka), `engine.js` (siatka w tle, Canvas 2D), `work.json` (9 projektów), `assets/` (logotypy SVG).
- `prototype/index.html`: zbudowana strona (publiczna, bez zdjęć). `prototype/img/`: postacie 3D działów. `prototype/media/`: `reel.mp4`, `work/NN-loop.mp4|gif`, `work/NN-film.mp4` (na razie pusto, są plansze zastępcze).
- `brand/`: logotypy z decku i znak ┐H.

## Build
- `python3 prototype/src/build.py` zbuduje `prototype/index.html`.
- Wersja ze zdjęciami (do podglądu): `python3 prototype/src/build.py --out <folder poza repo> --photos <paczka>/photos.json --fragment`. Powstaną `index.html`, `humanverse-v3.html` (fragment do artefaktu) i `files.json` (mapa plików do publikacji).
- Tłumaczenia: każdy tłumaczony element ma `data-i18n="klucz"`, a angielski tekst stoi w `body.html`. Polski dopisz w `pl.json` (po jednoliterowych słowach `&nbsp;`). Build musi skończyć się na „missing in pl.json: [] 0”. Element z kluczem nie może zawierać zagnieżdżonego elementu tego samego tagu.

## Ważne rozwiązania
- Przejścia kolorów: każda sekcja maluje własne tło z gradientem na górze. Canvas siatki (z-index 1) leży między tłem a treścią (z-index 2). Nawigacja bierze kolor sekcji pod sobą.
- Poniżej 900 px siatka się cofa: diagramy są bledsze i bez podpisów, a twarz AlterCast i znak ┐H są mniejsze i przesunięte w prawo. Linki chowają się pod „Menu”.
- Kontrast: zielony tekst na bieli to `--c-green-ink`, na zieleni nie ma białego tekstu, nagłówek AlterCast to ciemny tekst na białym pasku.

## Podgląd (artefakt)
- Prywatny podgląd: https://claude.ai/artifact/LTpuFYR1oomTkqHfVLJgJq . Żeby go zaktualizować z nowej sesji: najpierw Artifact `read` z tym url, potem publikacja fragmentu z `url` i `files` (klucze `img/...` i `media/...` z `files.json`). Pliki binarne do 15 MB.
- Właściciel zostawia uwagi w komentarzach do artefaktu: czytaj je przez ArtifactComments.

## Weryfikacja
Przed publikacją: build, potem Playwright (zrzuty przy 1440, 1024 i 390 px), poziomy overflow równy 0, brak błędów w konsoli. Jedno spojrzenie na zrzuty, jedna runda poprawek.

## Otwarte sprawy
- Brakuje reelu i 9 realizacji (pliki wideo plus teksty w `work.json`).
- Zgody osób z zespołu na zdjęcia i nazwiska na stronie, zgoda na nazwy klientów (np. UniCredit).
- Cztery komentarze w artefakcie są wprowadzone, ale wciąż otwarte (właściciel może je zamknąć).

## Git
Gałąź `claude/humanverse-website-redesign-hc11bo`. Commituj z opisowymi wiadomościami. PR tylko na prośbę właściciela.
