# Subwoofer Engineering Studio

Przeglądarkowa aplikacja do projektowania obudów subwooferowych. Działa lokalnie, bez serwera i kluczy API; projekt można opublikować na GitHub Pages.

## Funkcje

- Obudowy zamknięte i bass-reflex z portem szczelinowym lub rurowym.
- Obliczenia objętości netto, wyporności głośnika i portu oraz strojenia Helmholtza.
- Automatyczne dopasowanie długości portu z uwzględnieniem jego objętości i materiału.
- Podgląd 3D z wycięciami, trybem przezroczystym i rozstrzelonym.
- Lista cięcia, rysunki SVG, eksport DXF i CSV, zapis projektu JSON oraz ZIP z zaawansowanymi danymi głośnika i obudowy.
- Symulacja odpowiedzi akustycznej i kontrola kolizji montażowych.
- Zapis projektu w pamięci przeglądarki.

## Uruchomienie lokalne

Wymagany Node.js 22 lub nowszy.

```bash
npm install
npm run dev
```

Aplikacja otworzy się pod adresem `http://localhost:3000`.

## Sprawdzenie projektu

```bash
npm test
npm run typecheck
npm run build
```

## GitHub Pages

1. Wgraj pliki projektu do repozytorium GitHub.
2. W `Settings → Pages → Build and deployment` wybierz `GitHub Actions`.
3. Wypchnij zmiany do gałęzi `main` lub `master`. Workflow w `.github/workflows/deploy.yml` zbuduje aplikację, uruchomi testy i opublikuje katalog `dist`.

Vite używa ścieżek względnych, więc aplikacja działa również w repozytoriach projektu, np. `https://login.github.io/nazwa-repo/`.

## Model portu i porównanie z Subbox Pro

Długość portu jest liczona z równania rezonatora Helmholtza. Współczynnik korekcji portu szczelinowego dobrano przez porównanie z opublikowanym przykładem Subbox Pro dla obudowy 10 cali: 38 l, 38 Hz, pole 16,27 in² i długość 17,69 in. Ten przykład jest objęty testem regresyjnym. Algorytm Subbox Pro nie jest publicznie opisany, a strojenie gotowej skrzyni zależy także od zakończeń, zaokrągleń, prześwitu i wykonania portu; nie należy zakładać identyczności dla każdej geometrii.

## Dane i prywatność

Aplikacja przechowuje bieżący projekt w `localStorage`. Projekt można wyeksportować do JSON. Żadne dane nie są wysyłane do serwera.

ZIP z danymi technicznymi zawiera jeden plik JSON: parametry T/S i geometrię głośnika, konfigurację obudowy, bilans objętości, obliczenia portu, symulację akustyczną oraz dane konstrukcyjne paneli i listy elementów. Nie zawiera kodu aplikacji ani rysunków CAD.
