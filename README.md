# Humanverse v3

Nowa strona Humanverse: kompletny pakiet kreatywny AI dla marketingu (kreacja w każdej produkcji, produkcja z R&D, jeden.ai). AlterCast pokazujemy jako osobną spółkę, której technologię rozwija Humanverse. Typografia i kolory pochodzą z decku, klasyczny logotyp, a w tle jest interaktywna siatka.

- [`docs/PLAN.md`](docs/PLAN.md): plan strony, sekcje, system wizualny, przejścia kolorów, technologia, otwarte kwestie.
- [`prototype/index.html`](prototype/index.html): klikalny koncept w jednym pliku (PL/EN). Otwórz go w przeglądarce, poruszaj kursorem i przewijaj. Zdjęć zespołu nie ma w repozytorium, więc w ich miejscu są gradienty.
- [`prototype/src/`](prototype/src/): źródła prototypu. Po zmianach uruchom `python3 prototype/src/build.py`, a skrypt zbuduje `prototype/index.html` od nowa.
- [`brand/`](brand/): logotyp Humanverse i logo jeden.ai wyeksportowane z decku w Figmie oraz znak ┐H.

## Reel i realizacje

Pliki wideo wrzuć do `prototype/media/`:

| Plik | Gdzie się pokazuje |
| --- | --- |
| `reel.mp4` | reel w hero, od krawędzi do krawędzi, autoplay bez dźwięku |
| `work/01-loop.mp4` (albo `01-loop.gif`) | kafelek projektu 01 w siatce realizacji, pętla około 3 s |
| `work/01-film.mp4` | film w nakładce po kliknięciu kafelka 01 |

Projekty mają numery od `01` do `09`. Tytuł, podtytuł (klient · format · rok) i opis każdego projektu, po polsku i po angielsku, edytujesz w [`prototype/src/work.json`](prototype/src/work.json). Gdy pliku wideo brakuje, w jego miejscu jest plansza zastępcza. Wideo do strony warto skompresować (H.264, 1080p dla reelu, 720p dla pętli, bez dźwięku w pętlach).
