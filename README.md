# 7ano.jogos

Álbum de figurinhas com os jogos que a turma do 7º ano programou no Scratch. Clica na figurinha e joga ali mesmo.

## Como funciona

- A lista vem ao vivo da planilha de respostas do formulário (só as colunas de nome, jogo, sinopse, gênero e link — os e-mails nunca são buscados).
- Se a planilha não responder, o site usa a cópia salva dentro de `dados.js`.
- Reenvio do mesmo projeto substitui o anterior. Link sem projeto do Scratch aparece como "link pendente".

## Rodar local

```sh
python3 -m http.server 8000   # abrir http://localhost:8000
node teste-dados.mjs          # testa parser, normalização e deduplicação
```

Site estático, sem build: `index.html`, `styles.css`, `app.js`, `dados.js`. Publica direto no GitHub Pages (Settings → Pages → branch `main`, pasta raiz).
