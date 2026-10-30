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


## Dane i prywatność

Aplikacja przechowuje bieżący projekt w `localStorage`. Projekt można wyeksportować do JSON. Żadne dane nie są wysyłane do serwera.

