# Lampa Sexta Feira

Il sito della band: reggae brasiliano da São Paulo al Ticino. Sito statico su GitHub Pages (ramo `gh-pages`, dominio `lampasextafeira.com`), niente server e niente database.

## Come aggiungere un concerto

1. Apri il **camerino** (non è linkato da nessuna parte del sito):
   `https://lampasextafeira.com/camarim-7k2q/`
2. La prima volta incolla la chiave di accesso GitHub (vedi sotto). Resta salvata su quel telefono/computer.
3. Clicca **Aggiungi concerto**, compila data, locale e città (il resto è facoltativo), aggiungi una foto o la locandina e premi **Pubblica concerto**.
4. Dopo circa un minuto il concerto è sul sito. I concerti passati finiscono da soli nell'archivio "Dove abbiamo suonato".

Da lì puoi anche modificare un concerto, segnarlo come *Sold out* o *Annullato*, oppure eliminarlo.

### La chiave di accesso

Ogni membro della band può crearsene una, oppure Marco ne crea una e la condivide.

1. GitHub › Settings › Developer settings › Personal access tokens › **Fine-grained tokens** › Generate new token
2. Repository access: **Only select repositories** › `lampasextafeira`
3. Repository permissions: **Contents › Read and write** (nient'altro)
4. Scadenza a scelta, poi copia la chiave nel camerino.

La chiave può modificare solo questo repository. Se va persa basta revocarla su GitHub e crearne una nuova.

## Struttura

| Percorso | Cosa contiene |
|---|---|
| `index.html`, `css/style.css`, `js/main.js` | Il sito pubblico |
| `js/concerti.js` | Funzioni condivise: righe delle date, calendario `.ics`, dati per Google |
| `data/concerti.json` | Tutti i concerti (li scrive il camerino, si può anche modificare a mano) |
| `assets/concerti/` | Locandine e foto dei concerti (anche quelle caricate dal camerino) |
| `assets/img/` | Foto dal vivo, ritratti del trio, copertina dell'album |
| `assets/logo.svg` | Il logo vettoriale (livelli: bianco, giallo, blu, verde) |
| `camarim-7k2q/` | Il camerino (admin) |
| `assets/fonts/` | Inter Tight, ospitato qui (licenza OFL) |

Per cambiare l'indirizzo segreto del camerino basta rinominare la cartella `camarim-7k2q`.

## Pubblicazione

Il sito è servito da GitHub Pages dal ramo `gh-pages` (Settings › Pages), con il dominio indicato nel file `CNAME`. Il camerino scrive direttamente su `gh-pages`.

Il vecchio sito Mobirise resta nella cronologia di `gh-pages` se mai servisse recuperarlo.

## Provarlo in locale

```sh
python3 -m http.server 8000
# poi apri http://localhost:8000
```
