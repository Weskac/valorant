# VALORANT Map Veto — 2 hráči, bez PHP

Hotová stránka používá:
- HTML + CSS + JavaScript
- PeerJS/WebRTC pro spojení dvou počítačů přes internet (různé Wi‑Fi jsou v pořádku)
- Valorant-API pro obrázky/názvy map
- žádný PHP server ani vlastní databáze

## Spuštění

Nejjednodušší:
1. Rozbal ZIP.
2. Spusť `index.html` přes lokální webový server (doporučeno).
   - VS Code + Live Server, nebo
   - `python -m http.server 8000`
3. Otevři `http://localhost:8000`.
4. Player 1 klikne na **Vytvořit room**.
5. Druhý hráč zadá stejný kód a klikne **Připojit se**.
6. Po připojení se veto synchronizuje přes WebRTC.

> Pro dvě různá zařízení nepoužívej `file:///.../index.html`; použij webserver/hosting.

## Pool

V `app.js` je nahoře:
`const MAP_POOL = ["Abyss", "Ascent", "Haven", "Lotus", "Split", "Summit", "Sunset"];`

Stačí tento seznam změnit, pokud Riot pool později změní.

## Jak funguje veto

- Player 1 ban
- Player 2 ban
- Player 1 ban
- Player 2 ban
- Player 1 ban
- Player 2 ban
- poslední mapa = vybraná mapa

## Obrázky map

`app.js` volá:
`https://valorant-api.com/v1/maps?language=en-US`

A z API používá `splash`/`displayIcon`.

VALORANT API je komunitní veřejné API; Riot zároveň poskytuje vlastní veřejný Content Catalog. Před veřejným nasazením zkontroluj aktuální Riot Developer Policy a podmínky použití assetů.

## Poznámka k WebRTC

PeerJS zajišťuje signalizaci přes veřejný PeerServer a samotný datový přenos je WebRTC. U některých restriktivních firemních/síťových firewallů může být přímé spojení blokované. Pro běžné domácí Wi‑Fi by měl tento model fungovat.
