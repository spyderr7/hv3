# Humanverse v3: plan nowej strony

Nowa strona pokazuje Humanverse jako ekosystem rozwiązań AI dla marketingu, a nie tylko dom produkcyjny. Wraca klasyczny logotyp (znak ┐H, kolor #3D00FF), a tłem całej strony jest „żywa siatka”, która reaguje na kursor i zmienia formę w każdej sekcji.

Prototyp: [`prototype/index.html`](../prototype/index.html) (otwórz w przeglądarce).

## 1. Pozycjonowanie i architektura marki

Humanverse jest marką parasolową. Cztery elementy układają się w jeden łańcuch wartości:

| Element | Rola | Dla kogo | Jak występuje na stronie |
| --- | --- | --- | --- |
| Marketing Solutions | Strategia: rozwiązania marketingowe szyte pod cel | działy marketingu, agencje | główny filar, pierwsza sekcja oferty |
| Humanverse Studio | Produkcja: spoty, sesje AI, CGI, AIMatiki, muzyka i głos | marki, agencje 360 | sekcja + case studies |
| Jeden.ai | Skala: automatyzacja contentu produktowego | e-commerce, performance | sekcja produktowa, link do własnej strony |
| AlterCast | Zaufanie: licencjonowane twarze do produkcji AI | marki, domy produkcyjne, ludzie | sekcja produktowa, link do altercast.ai |

Marketing Solutions i Studio to działy Humanverse w jednym systemie wizualnym. Jeden.ai i AlterCast to marki produktowe: ich kolory pojawiają się tylko w ich sekcjach.

## 2. Mapa strony

- Strona główna
- Marketing Solutions, z podstroną każdego rozwiązania
- Studio
- Case studies (lista + podstrona case'u)
- Jeden.ai
- AlterCast (osobne wejścia: dla marek i dla ludzi)
- Odpowiedzialne AI (AI Act, licencje, prawa)
- O nas (zespół, historia, kariera)
- Insights (artykuły, media)
- Kontakt
- Wersja EN całości

## 3. Strona główna

| # | Sekcja | Treść | Siatka | Tło |
| --- | --- | --- | --- | --- |
| 00 | Hero | „Humanizujemy AI.”, 2 CTA, lista ekosystemu | tkanina: gnie się do kursora, fala po kliknięciu | fiolet |
| 01 | Ekosystem | łańcuch: strategia → produkcja → skala → zaufanie | tkanina | fiolet |
| 02 | Marketing Solutions | 6 rozwiązań opisanych językiem celu (treść z one-pagera) | moduły (siatka kart) | papier |
| 03 | Studio | showreel + wybrane realizacje | kadry 16:9, kursor jak lupa montażysty | ink |
| 04 | Jeden.ai | „Jedno zdjęcie. Jedna inteligencja. Nieskończona jakość.” | pipeline: 1 zdjęcie → wiele formatów | ink |
| 05 | AlterCast | dla marek / dla ludzi | twarz 3D z siatki, patrzy za kursorem | papier |
| 06 | Odpowiedzialne AI | art. 50 AI Act, licencje wizerunku, prawa do materiałów | spokojna siatka | papier |
| 07 | Kontakt | formularz z wyborem tematu i routingiem | linie układają się w znak ┐H | fiolet |

## 4. Żywa siatka

**Interakcje**
- Siatka zagina się w stronę kursora jak czasoprzestrzeń wokół masy. Człowiek jest w centrum „verse”.
- Szybki ruch zostawia falę, kliknięcie puszcza falę uderzeniową.
- Komórka pod kursorem dostaje narożniki wizjera i współrzędne w foncie mono.
- Bez ruchu myszy siatka „oddycha”, a punkt skupienia krąży sam, więc strona żyje też na telefonie i na zrzutach.

**Jedna siatka, wiele światów.** Przy scrollu te same linie płynnie zmieniają układ: moduły, kadry, pipeline, twarz, logo. To metafora ekosystemu: jedna technologia, różne zastosowania.

**Technologia (produkcja)**
- WebGL (Three.js lub OGL): jeden canvas za stroną, linie rysowane shaderem, tryby jako cele morfingu sterowane scrollem (GSAP ScrollTrigger).
- Zapasowo Canvas 2D (tak działa prototyp), a przy ustawieniu „ogranicz ruch” statyczna siatka.
- Telefon: reakcja na dotyk i przechylenie, mniejsza gęstość siatki, limit DPR.
- Budżet: kod efektu poniżej 40 KB, 60 kl./s, pauza poza ekranem i w ukrytej karcie, LCP to tekst hero (canvas startuje po nim).

## 5. System wizualny

- Logo: klasyczny znak i logotyp z prezentacji „V_H logos”. „Human” w #3D00FF, „verse” w czerni. Na fiolecie całość biała.
- Detal marki: „hak” ze znaku H (belka w lewo od trzonu) na przyciskach, etykietach i w narożnikach.
- Kolory: fiolet #3D00FF, ink #0A0816, papier #F7F6FB. Akcenty produktów: Jeden.ai #7B6FFF, AlterCast #FBAA19 i #0070E7.
- Typografia: nagłówki geometryczne jak w brand booku (najbliżej: Montserrat Alternates, do potwierdzenia), tekst Kumbh Sans, etykiety IBM Plex Mono.
- Easter egg: ┐H z buźką z brand booka („Let's humanize AI!”) jako loader albo strona 404.

## 6. Stack

- Next.js + TypeScript na Vercelu (jak v2), Tailwind.
- CMS (Sanity lub Payload): case studies, rozwiązania, zespół, insights.
- i18n PL/EN, formularz z routingiem po temacie, analityka zdarzeń na CTA, zgody cookies.
- Wideo przez streaming (Mux lub Cloudflare Stream), dynamiczne obrazki OG ze znakiem ┐H.

## 7. Etapy

1. Materiały i decyzje: one-pager, logo w wektorze, fonty, case studies, kolor hero.
2. Strona główna w kodzie: hero, siatka WebGL, sekcje, wersja PL.
3. Podstrony, CMS, formularze.
4. Treści EN, testy wydajności i dostępności, SEO, publikacja.

## 8. Otwarte pytania

- Treść one-pagera z Marketing Solutions: nazwy i opisy rozwiązań.
- Pliki źródłowe logo (SVG/AI) i fonty z księgi znaku. Pliki w `brand/` to wersja robocza: znak odtworzony geometrycznie, logotyp odrysowany z prezentacji.
- Kod lub dostęp do strony v2, żeby przenieść to, co działało.
- Które case studies i logotypy klientów można pokazać publicznie.
- Hero: fiolet czy ink (przełącznik w panelu prototypu).
