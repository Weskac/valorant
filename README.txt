VALORANT MAP VETO – GitHub Pages

Tato verze je upravena pro dva počítače přes internet.
Nepotřebuje PHP ani vlastní backend. Realtime signalizaci zajišťuje PeerJS Cloud a samotná data veto se posílají přes WebRTC.

GITHUB PAGES
1. Nahraj všechny 4 soubory do repository.
2. Settings -> Pages -> Deploy from branch -> main -> /(root).
3. Otevři HTTPS adresu GitHub Pages.

POUŽITÍ
Player 1:
- zadej jméno
- Vytvořit room
- pošli kód druhému hráči

Player 2:
- zadej jméno
- zadej kód
- Připojit se

Pokud se spojení nepodaří, stránka nyní zobrazí konkrétní chybu místo tichého selhání.

POZNÁMKA
PeerJS používá signalizační server pro nalezení druhého klienta; samotná data pak tečou přes WebRTC. U některých sítí může být potřeba TURN relay kvůli NAT/firewallu.
