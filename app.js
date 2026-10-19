"use strict";
// Interface do álbum. Os dados vêm prontos de dados.js (Dados.carregar); aqui é só desenho e interação.

// Ícones: só strings fixas daqui. Nada da planilha passa por innerHTML.
const ICONES = {
  raio: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 1.5 3.5 14H11l-1.5 8.5L20.5 9.5H13z"/></svg>',
  montanha: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M1 21 8.5 8l4.2 7 2.8-4L23 21z"/><path d="M14.6 2.2h1.6V10h-1.6z"/><path d="M16.2 2.5H22l-1.6 2.1L22 6.7h-5.8z"/></svg>',
  bola: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="12" cy="12" r="9.8"/><path d="M2.2 12h19.6M12 2.2v19.6M5.3 4.9c3.6 3.9 3.6 10.3 0 14.2M18.7 4.9c-3.6 3.9-3.6 10.3 0 14.2"/></svg>',
  estrela: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 1.8 3.1 6.9 7.4.7-5.6 5 1.7 7.4L12 18l-6.6 3.8 1.7-7.4-5.6-5 7.4-.7z"/></svg>',
  seta: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h8v8M15 3 4 14"/></svg>'
};

// Cores de tinta por seção. a = fundo, b = padrão, l = letra.
const GENEROS = {
  acao:     { cor:"#E8352A", ct:"#fff",    icone:"raio",     desc:"Luta, tiro e esquiva. Aqui ninguém fica parado.",
              pal:[{a:"#E8352A",b:"#CC2A20",l:"#FFD60A"},{a:"#FF48B0",b:"#EE3A9E",l:"#fff"},{a:"#1E1E1E",b:"#303030",l:"#FF5A4E"}] },
  aventura: { cor:"#FF8A00", ct:"#151515", icone:"montanha", desc:"Plataforma, mapa e mistério. Vai explorando que alguma coisa aparece.",
              pal:[{a:"#FF8A00",b:"#F07A00",l:"#fff"},{a:"#FFD60A",b:"#F2C700",l:"#FF8A00"},{a:"#11A3A0",b:"#0D918E",l:"#FFD60A"}] },
  esportes: { cor:"#0078BF", ct:"#fff",    icone:"bola",     desc:"Placar, cesta e disputa. Melhor ainda se tiver alguém do lado pra desafiar.",
              pal:[{a:"#0078BF",b:"#0069A8",l:"#fff"},{a:"#00A651",b:"#009447",l:"#FFD60A"},{a:"#FFD60A",b:"#F2C700",l:"#0078BF"}] }
};
const ORDEM = ["acao", "aventura", "esportes"];
const EXTRAS = [["#00A88F","#00957F"],["#D6336C","#C22A5F"],["#8C5A2B","#7B4E25"],["#55702A","#4A6224"]];

const PADROES = [
  (a, b) => `repeating-conic-gradient(from -4deg at 50% 118%, ${b} 0 7deg, ${a} 7deg 14deg)`,
  (a, b) => `radial-gradient(${b} 30%, transparent 32%) 0 0/15px 15px, ${a}`,
  (a, b) => `repeating-linear-gradient(-45deg, ${b} 0 11px, ${a} 11px 22px)`,
  (a, b) => `conic-gradient(${b} 25%, ${a} 0 50%, ${b} 0 75%, ${a} 0) 0 0/34px 34px`,
  (a, b) => `repeating-radial-gradient(circle at 12% 88%, ${b} 0 10px, ${a} 10px 20px)`,
  (a, b) => `linear-gradient(100deg, ${a} 0 61%, ${b} 61%)`
];
const GIROS = [-2.2, -1.5, -.8, .5, 1.1, 1.8, 2.4];

/* ---------- utilidades ---------- */
const $ = id => document.getElementById(id);
function el(tag, cls, texto) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (texto != null) e.textContent = texto;
  return e;
}
function icone(nome) { const s = el("span"); s.style.display = "contents"; s.innerHTML = ICONES[nome]; return s; }
const dois = n => String(n).padStart(2, "0");
const semAcento = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const sorteia = lista => lista[Math.floor(Math.random() * lista.length)];
function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

let JOGOS = [], SECOES = [];
const estado = { q: "", gen: "todas" };

/* ---------- coladas: jogos que o visitante já abriu (storage é opcional) ---------- */
const COLADAS = "album7:coladas";
const coladas = new Set((() => {
  try { const v = JSON.parse(localStorage.getItem(COLADAS)); return Array.isArray(v) ? v : []; }
  catch { return []; }
})());
function colar(j) {
  if (!j.id) return; // link pendente: ainda não tem figurinha para colar
  coladas.add(j.chave);
  j.li.classList.add("colada");
  try { localStorage.setItem(COLADAS, JSON.stringify([...coladas])); } catch { /* sem storage: vale só nesta visita */ }
  contarColadas();
}
function contarColadas() {
  const dd = $("c-coladas");
  if (dd) dd.textContent = JOGOS.filter(j => coladas.has(j.chave)).length;
}

/* ---------- desenho ---------- */
function linhasDoPoster(t) {
  const palavras = t.toUpperCase().split(" ");
  const max = Math.max(7, ...palavras.map(p => p.length));
  const out = [];
  for (const p of palavras) {
    const ult = out[out.length - 1];
    if (ult && (ult + " " + p).length <= max) out[out.length - 1] = ult + " " + p; else out.push(p);
  }
  return out;
}

function configSecao(k) {
  if (GENEROS[k]) return GENEROS[k];
  const [c, d] = EXTRAS[hash(k) % EXTRAS.length]; // gênero novo na planilha: cor estável pelo nome
  return { cor: c, ct: "#fff", icone: "estrela", desc: null,
           pal: [{a:c,b:d,l:"#fff"},{a:"#FFD60A",b:"#F2C700",l:c},{a:"#1E1E1E",b:"#303030",l:"#FFD60A"}] };
}

function figurinha(j) {
  const li = el("li", "slot");
  li.dataset.n = dois(j.n);
  if (coladas.has(j.chave)) li.classList.add("colada");
  const b = el("button", j.id ? "fig" : "vazia");
  b.type = "button";
  b.dataset.jogo = j.chave;
  b.setAttribute("aria-label", `Nº ${dois(j.n)}: ${j.titulo}, feito por ${j.autor}${j.id ? "" : ". Link pendente"}`);
  b.addEventListener("click", () => abrir(j));
  j.li = li;
  j.botao = b;
  li.append(b);

  if (!j.id) { // sem link: o espaço fica à espera, mas o trabalho aparece
    b.append(el("span", "gde", dois(j.n)), el("span", "cole", "cole aqui"), el("span", "t", j.titulo), el("span", "a", j.autor), el("span", "carimbo", "link pendente"));
    return li;
  }
  const cfg = j.secao.cfg;
  const h = hash(j.chave + j.titulo);
  const p = cfg.pal[h % cfg.pal.length];
  b.style.setProperty("--rot", GIROS[(h >>> 4) % GIROS.length] + "deg");
  b.style.setProperty("--dx", ((h >>> 8) % 5 - 2) + "px");
  b.style.setProperty("--dy", ((h >>> 11) % 5 - 2) + "px");
  const arte = el("span", "arte");
  arte.style.background = PADROES[(h >>> 14) % PADROES.length](p.a, p.b);
  const linhas = linhasDoPoster(j.titulo);
  const poster = el("span", "poster");
  poster.style.setProperty("--len", Math.max(4, ...linhas.map(l => l.length)));
  poster.style.setProperty("--n", linhas.length);
  poster.style.setProperty("--prot", (((h >>> 17) % 9) - 6) + "deg");
  poster.style.setProperty("--letra", p.l);
  for (const l of linhas) poster.append(el("span", null, l));
  const esc = el("span", "escudinho");
  esc.append(icone(cfg.icone));
  arte.append(poster, esc);
  const faixa = el("span", "faixa");
  faixa.append(el("span", "num", dois(j.n)), el("span", "autor", j.autor));
  b.append(arte, faixa);
  return li;
}

function render() {
  // Agrupa por gênero sem acento/caixa ("Ação" = "acao"); conhecidos na ORDEM, os novos depois.
  const grupos = new Map();
  for (const j of JOGOS) {
    const k = semAcento(j.genero);
    if (!grupos.has(k)) grupos.set(k, { k, nome: j.genero, jogos: [] });
    grupos.get(k).jogos.push(j);
  }
  const pos = k => { const i = ORDEM.indexOf(k); return i < 0 ? 99 : i; };
  SECOES = [...grupos.values()].sort((a, b) => pos(a.k) - pos(b.k) || a.k.localeCompare(b.k));

  let n = 0;
  const main = $("album");
  main.replaceChildren();
  SECOES.forEach((s, i) => {
    s.cfg = configSecao(s.k);
    for (const j of s.jogos) { j.n = ++n; j.secao = s; j.busca = semAcento(j.titulo + " " + j.autor); }
    const sec = el("section", "pagina");
    sec.style.setProperty("--cor", s.cfg.cor);
    sec.style.setProperty("--ct", s.cfg.ct);
    const topo = el("header", "pag-topo");
    const h2 = el("h2", null, s.nome);
    h2.id = "secao-" + i;
    sec.setAttribute("aria-labelledby", h2.id);
    const primeiro = s.jogos[0].n, ultimo = s.jogos[s.jogos.length - 1].n;
    topo.append(h2, el("p", "faixa-num", primeiro === ultimo ? "Figurinha " + dois(primeiro) : "Figurinhas " + dois(primeiro) + " a " + dois(ultimo)));
    const desc = el("p", "pag-desc", s.cfg.desc || ("Os jogos que a turma marcou como " + s.nome + "."));
    const grade = el("ul", "grade");
    const escudo = el("li", "slot");
    escudo.dataset.n = "";
    const fe = el("div", "escudo foil");
    fe.setAttribute("role", "img");
    fe.setAttribute("aria-label", "Escudo da seção " + s.nome);
    const forma = el("span", "forma");
    forma.append(icone(s.cfg.icone));
    fe.append(forma, el("b", null, s.nome), el("small", null, "brilhante"));
    escudo.append(fe);
    grade.append(escudo, ...s.jogos.map(figurinha));
    sec.append(topo, desc, grade, el("span", "pag-num", "pág. " + (i + 2)));
    s.el = sec;
    main.append(sec);
  });

  const nada = el("section", "nada");
  nada.id = "nada";
  nada.hidden = true;
  const limpar = el("button", "btn claro", "Limpar busca");
  limpar.type = "button";
  limpar.addEventListener("click", () => { limparFiltros(); $("busca").focus(); });
  nada.append(el("p", "mao", "Hmm, essa não saiu em nenhum pacotinho."), el("h2"), el("p", null, "Tenta outro pedaço do nome do jogo ou de quem fez. Acento não precisa."), limpar);
  main.append(nada);

  // abas
  const abas = $("abas");
  abas.replaceChildren();
  const aba = (k, nome, qt, cfg) => {
    const b = el("button", "aba");
    b.type = "button";
    b.dataset.k = k;
    if (cfg) { b.style.setProperty("--c", cfg.cor); b.style.setProperty("--ct", cfg.ct); b.append(icone(cfg.icone)); }
    b.append(el("span", null, nome), el("span", "qt", String(qt)));
    b.addEventListener("click", () => { estado.gen = k; aplicar(); });
    abas.append(b);
  };
  aba("todas", "Todas", JOGOS.length);
  for (const s of SECOES) aba(s.k, s.nome, s.jogos.length, s.cfg);

  // conferência
  const pendentes = JOGOS.filter(j => !j.id).length;
  $("c-jogos").textContent = JOGOS.length;
  $("c-craques").textContent = new Set(JOGOS.map(j => semAcento(j.autor))).size;
  $("c-secoes").textContent = SECOES.length;
  contarColadas();
  const nota = $("c-nota");
  nota.textContent = pendentes ? (pendentes === 1 ? "falta 1 link!" : "faltam " + pendentes + " links!") : "completo!";
  if (!matchMedia("(max-width:760px)").matches) {
    nota.insertAdjacentHTML("beforeend", '<svg viewBox="0 0 40 30" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M2 24c10 2 22-4 31-17"/><path d="M25 6l8 1-1 8"/></svg>');
  }
  nota.hidden = false;
  $("controles").hidden = false;
  aplicar(false);
}

// Mostra só o que passa na busca + aba. anunciar=false no primeiro desenho (nada a dizer ao leitor de tela).
function aplicar(anunciar = true) {
  const q = semAcento(estado.q.trim().replace(/\s+/g, " "));
  let vis = 0;
  for (const s of SECOES) {
    let n = 0;
    for (const j of s.jogos) {
      const ok = (estado.gen === "todas" || estado.gen === s.k) && (!q || j.busca.includes(q));
      j.li.hidden = !ok;
      if (ok) n++;
    }
    s.el.hidden = !n;
    vis += n;
  }
  for (const b of $("abas").children) b.setAttribute("aria-pressed", String(b.dataset.k === estado.gen));
  const nada = $("nada");
  nada.hidden = vis > 0;
  if (!vis) nada.querySelector("h2").textContent = "Nenhuma figurinha com “" + estado.q.trim() + "”" + (estado.gen !== "todas" ? " nessa seção" : "") + ".";
  $("status").textContent = !anunciar ? "" : vis ? `Mostrando ${vis} de ${JOGOS.length} figurinhas.` : "Nenhuma figurinha encontrada.";
}

function limparFiltros() {
  $("busca").value = "";
  estado.q = "";
  estado.gen = "todas";
  aplicar();
}

/* ---------- tela de jogo ---------- */
// Histórico: abrir() empilha #jogo=<chave>, então o "voltar" do celular fecha a tela; fechar pelo botão/Esc
// limpa o hash na hora e faz history.back() para tirar essa entrada (o histórico fica como estava).
// empilhado: a entrada atual foi criada pelo abrir(). voltando: há um back() nosso ainda em andamento.
let aberto = null, empilhado = false, voltando = false;

function abrir(j) {
  const d = $("tela-jogo"), cfg = j.secao.cfg;
  aberto = j;
  d.style.setProperty("--cor", cfg.cor);
  d.style.setProperty("--ct", cfg.ct);
  $("t-num").textContent = "Nº " + dois(j.n);
  $("t-gen").replaceChildren(icone(cfg.icone), j.secao.nome);
  $("t-titulo").textContent = j.titulo;
  $("t-autor").textContent = j.autor;
  $("t-sinopse").textContent = j.sinopse || "Quem fez ainda não escreveu sobre o jogo.";
  const palco = $("t-palco"), acoes = $("t-acoes");
  palco.replaceChildren();
  acoes.replaceChildren();
  if (j.id) {
    const f = el("iframe");
    f.src = j.embed;
    f.title = "Jogo " + j.titulo + ", de " + j.autor;
    f.allow = "autoplay; fullscreen";
    palco.append(f);
    const a = el("a", "btn");
    a.href = j.url;
    a.target = "_blank";
    a.rel = "noopener";
    a.append("Abrir no Scratch", icone("seta"));
    acoes.append(a);
  } else {
    const v = el("div", "palco-vazio");
    v.append(el("p", "mao", "Essa figurinha ainda não chegou."), el("p", null, "O link do projeto no Scratch não veio junto no formulário. Quando chegar, o jogo aparece aqui."));
    palco.append(v);
  }
  $("t-aviso").hidden = !j.id;
  const alvo = "#jogo=" + j.chave;
  if (location.hash !== alvo) {
    if (voltando) history.replaceState(null, "", alvo); // o pushState fica para quando o back() terminar
    else { history.pushState(null, "", alvo); empilhado = true; }
  }
  if (!d.open) d.showModal();
  $("t-fechar").focus();
  colar(j);
}

function aoFechar() {
  $("t-palco").replaceChildren(); // tira o iframe: o som para junto
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  if (empilhado) { empilhado = false; voltando = true; history.back(); }
  const j = aberto;
  aberto = null;
  if (!j) return;
  j.botao.focus();
  j.li.classList.remove("colando");
  void j.li.offsetWidth; // reinicia a animação
  j.li.classList.add("colando");
  setTimeout(() => j.li.classList.remove("colando"), 400);
}

// Deep link (#jogo=<chave>, que é o id do Scratch) e botão voltar/avançar.
function pelaHash() {
  const m = /^#jogo=(.+)$/.exec(location.hash);
  const j = m && JOGOS.find(x => x.chave === m[1]);
  if (j ? aberto === j : !$("tela-jogo").open) return;
  empilhado = false; // quem mudou a entrada foi o navegador (voltar, avançar, link), não o abrir()
  if (j) abrir(j); else $("tela-jogo").close();
}

// Fim do back() do aoFechar. Se outro jogo abriu nesse meio-tempo, empilha a entrada dele agora.
function aoVoltar() {
  if (!voltando) return;
  voltando = false;
  if (aberto) { history.pushState(null, "", "#jogo=" + aberto.chave); empilhado = true; }
}

/* ---------- pacotinho ---------- */
let sorteando = false;
function sortear() {
  const jogaveis = JOGOS.filter(j => j.id);
  if (sorteando || !jogaveis.length) return;
  let pool = jogaveis.filter(j => !j.li.hidden);
  if (!pool.length) { limparFiltros(); pool = jogaveis; } // busca vazia: sorteia do álbum todo
  const novos = pool.filter(j => !coladas.has(j.chave));
  const escolhido = sorteia(novos.length ? novos : pool);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return abrir(escolhido);
  sorteando = true;
  let passos = 0, atual = null;
  const pisca = setInterval(() => {
    if (atual) atual.li.classList.remove("sorteio");
    if (++passos > 7) {
      clearInterval(pisca);
      escolhido.li.classList.add("sorteio");
      escolhido.li.scrollIntoView({ block: "center", behavior: "smooth" });
      setTimeout(() => { escolhido.li.classList.remove("sorteio"); sorteando = false; abrir(escolhido); }, 380);
      return;
    }
    atual = sorteia(pool);
    atual.li.classList.add("sorteio");
  }, 85);
}

/* ---------- liga tudo ---------- */
$("t-fechar").addEventListener("click", () => $("tela-jogo").close());
$("tela-jogo").addEventListener("close", aoFechar);
$("tela-jogo").addEventListener("click", e => { if (e.target === e.currentTarget) e.currentTarget.close(); });
$("busca").addEventListener("input", e => { estado.q = e.target.value; aplicar(); });
$("pacotinho").addEventListener("click", sortear);
addEventListener("popstate", aoVoltar); // dispara antes do hashchange
addEventListener("hashchange", pelaHash);

Dados.carregar().then(({ jogos, fonte }) => {
  JOGOS = jogos.map(j => ({ ...j, titulo: j.titulo || "Jogo sem nome", autor: j.autor || "Sem nome" }));
  render();
  $("fonte").textContent = fonte === "ao-vivo"
    ? "Lista ao vivo, direto da planilha da turma."
    : "A planilha não respondeu agora; o álbum está mostrando a cópia salva da lista.";
  pelaHash();
});
