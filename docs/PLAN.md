# Humanverse v3: plan nowej strony

Strona pokazuje Humanverse tak jak deck partnerski: **kompletny pakiet kreatywny AI dla marketingu**, a nie agencję i nie sam dom produkcyjny. Klasyczny logotyp, typografia i kolory z decku, ludzie na pierwszym planie, a w tle żywa siatka, która reaguje na kursor i zmienia formę w każdej sekcji.

Prototyp: [`prototype/index.html`](../prototype/index.html) (otwórz w przeglądarce; PL/EN w nawigacji, „Panel konceptu” w prawym dolnym rogu).

## 1. Pozycjonowanie

- „Nie tylko dom produkcyjny. Nie tylko agencja reklamowa. Nie tylko postprodukcja. Kompletny pakiet kreatywny AI dla marketingu.”
- Kreacja to **Inside every production**: kreatywny nadzór studia (idea, scenariusz, look, finalny montaż), audyt pomysłów i scenariuszy agencji i klienta, dopracowanie kreacji pod pipeline i AI. Nie sprzedajemy się jako agencja.
- Produkcja: „Purpose over novelty” – live action, hybryda, full AI, znajomy proces produkcyjny, jeden master na wiele rynków. R&D jako część każdego projektu.
- jeden.ai: system budowany wokół marki (węzły: baza produktów → modele → każdy format).
- AlterCast: osobna spółka; Humanverse rozwija jej technologię. Sekcja w kolorach AlterCast (żółty + biel).
- Podejście i etyka: „We don't sell AI. We sell people.”, „Built on trust” (etyka, transparentność, partnerstwo), AI Act.
- Bez tajemnic: na stronie nie ma planów sprzedażowych, wycen, wyników ani niezapowiedzianych produktów.

## 2. Strona główna

| # | Sekcja | Tło | Siatka |
| --- | --- | --- | --- |
| 0 | Hero: „Humanizujemy AI.” + tagline z decku + 3 liczby | fiolet | tkanina (gnie się do kursora, fala po kliknięciu) |
| 1 | Pozycjonowanie („Not just…”) + trzy marki | zieleń | spokojna |
| 2 | The Team: zdjęcie zespołu, 3 → 30, „rośliśmy z klientami” | fiolet | tkanina |
| 3 | Kreacja: „Idea first. Then the tool.” / Inside every production | biel + pasek z logo | kadry storyboardu |
| 4 | Produkcja + R&D | fiolet | proces produkcji (8 kroków) |
| 5 | jeden.ai | biel + pasek | pipeline węzłów |
| 6 | Jak myślimy (podejście do biznesu) | zieleń | moduły |
| 7 | Jak jesteśmy zbudowani: założyciele, działy (New Business, Client Service, Creative, Production, R&D), kariera | biel + pasek | moduły |
| 8 | Built on trust: etyka, AI Act | fiolet | spokojna |
| 9 | AlterCast (osobna spółka) | żółty + biel | twarz 3D patrząca za kursorem |
| 10 | Kontakt: „Zacznijmy od jednej kampanii” | fiolet | linie składają się w znak ┐H |

## 3. System wizualny (z decku)

- Fonty: **Barlow Condensed** ExtraBold (ogromne nagłówki, wersaliki, dwa kolory), **Space Grotesk** (tekst; pogrubione listy jak w decku), Barlow Condensed Light Italic (cytaty). Oba z Google Fonts, z polskimi znakami.
- Kolory: fiolet #4C02E8, zieleń #00CC66, biel; AlterCast #FBAA19 + biel + #231F20. Zielony tekst na białym tle jest o ton ciemniejszy (#00A659), żeby duże nagłówki miały kontrast co najmniej 3:1. Na zielonym tle nie ma białego tekstu. W sekcji AlterCast druga część nagłówka to ciemny tekst na białym pasku, więc biel AlterCast zostaje, a tekst jest czytelny.
- Motywy: pionowy fioletowy pasek z obróconym logo na białych sekcjach, czarne „pigułki” jako etykiety, zdjęcie zespołu w kształcie kapsuły, portrety w duotonie fiolet/zieleń w owalach, postacie 3D działów.

## 4. Przejścia kolorów (poprawka)

Każda sekcja maluje własne tło. Siatka rysuje się między tłem a tekstem i przyjmuje kolor sekcji, nad którą akurat jest. Tekst nigdy nie stoi na kolorze, który zmienia się pod nim. Płynne przejście to gradient na górze każdej sekcji, w pustym miejscu przed treścią. Nawigacja bierze kolor z sekcji, która jest pod nią. W panelu można przełączyć przejścia na ostre.

Na telefonie i na tablecie w pionie tekst zajmuje całą szerokość, więc siatka się cofa. Diagramy są bledsze i nie mają podpisów, a twarz AlterCast i znak ┐H są mniejsze i przesunięte w prawo. Poniżej 900 px linki nawigacji chowają się pod przyciskiem „Menu”.

## 5. Technologia

- Produkcyjnie: Next.js na Vercelu, CMS na case studies, zespół i aktualności, PL/EN.
- Siatka: WebGL w wersji produkcyjnej. Prototyp to Canvas 2D bez bibliotek, 60 kl./s; przy „ogranicz ruch” siatka jest statyczna.

## 6. Otwarte kwestie

- Zgody osób z zespołu na publikację zdjęć i nazwisk na stronie (w repo są tylko imiona, nazwiska i role; zdjęć nie commitujemy).
- Które realizacje i logotypy klientów można pokazać publicznie.
- Finalne pliki logo w wektorze z księgi znaku.
