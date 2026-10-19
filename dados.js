// Camada de dados do catálogo: lê a planilha do formulário (ao vivo) ou o snapshot embutido.
// Sem DOM aqui. Os textos voltam crus (não escapados): a interface deve usar textContent.
(function (root) {
  'use strict'

  // Só as colunas C..G (autor, título, sinopse, gênero, link): nunca traz os e-mails dos alunos.
  var URL_AO_VIVO = 'https://docs.google.com/spreadsheets/d/1CdXYCjGnyWVIqHW8PtEDSdBJclfyHO-ufkGYiJRaIME/gviz/tq?tqx=out:csv&tq=select%20C,D,E,F,G'
  var TIMEOUT_MS = 6000
  var PARTICULAS = ['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'em', 'no', 'na', 'com']

  // CSV (RFC 4180): aspas, "" escapado, vírgulas e quebras de linha dentro de campos.
  function lerCSV(texto) {
    var linhas = [], linha = [], campo = '', aspas = false
    for (var i = 0; i < texto.length; i++) {
      var c = texto[i]
      if (aspas) {
        if (c !== '"') campo += c
        else if (texto[i + 1] === '"') { campo += '"'; i++ }
        else aspas = false
      } else if (c === '"') aspas = true
      else if (c === ',') { linha.push(campo); campo = '' }
      else if (c === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = '' }
      else if (c !== '\r') campo += c
    }
    if (campo || linha.length) { linha.push(campo); linhas.push(linha) }
    return linhas
  }

  function limpar(s) {
    return (s || '').replace(/\s+/g, ' ').trim()
  }

  // Title Case só se o aluno digitou tudo em minúsculas; senão mantém como digitado.
  function titleCase(s) {
    if (s !== s.toLocaleLowerCase('pt-BR')) return s
    return s.split(' ').map(function (p, i) {
      if (i > 0 && PARTICULAS.indexOf(p) !== -1) return p
      return p.charAt(0).toLocaleUpperCase('pt-BR') + p.slice(1)
    }).join(' ')
  }

  function slug(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  }

  function processarCSV(texto) {
    var jogos = lerCSV(texto).slice(1).map(function (col) {
      var autor = titleCase(limpar(col[0]))
      var titulo = titleCase(limpar(col[1]))
      if (!autor && !titulo) return null
      // O link cru da planilha nunca é usado: só o id numérico, e as URLs são montadas aqui.
      var m = /scratch\.mit\.edu\/projects\/(\d+)/.exec(col[4] || '')
      var id = m ? m[1] : null
      var base = 'https://scratch.mit.edu/projects/' + id + '/'
      return {
        chave: id || 'sem-id-' + slug(autor + '-' + titulo),
        id: id,
        titulo: titulo,
        autor: autor,
        genero: limpar(col[3]) || 'Outros',
        sinopse: (col[2] || '').replace(/\r\n?/g, '\n').trim().replace(/\n{3,}/g, '\n\n'),
        url: id && base,
        embed: id && base + 'embed',
        thumb: id && 'https://uploads.scratch.mit.edu/get_image/project/' + id + '_480x360.png'
      }
    }).filter(Boolean)

    // Duplicata = reenvio/correção: fica a última ocorrência, na posição dela.
    var ultimo = {}
    jogos.forEach(function (j) { ultimo[j.chave] = j })
    return jogos.filter(function (j) { return ultimo[j.chave] === j })
  }

  function carregar() {
    var ctrl = new AbortController()
    var timer = setTimeout(function () { ctrl.abort() }, TIMEOUT_MS)
    return fetch(URL_AO_VIVO, { signal: ctrl.signal })
      .then(function (res) {
        // Planilha privada devolve página HTML de login com 200: exige CSV de verdade.
        if (!res.ok || !/csv/.test(res.headers.get('content-type') || '')) throw new Error('HTTP ' + res.status)
        return res.text()
      })
      .then(function (texto) {
        var jogos = processarCSV(texto)
        if (!jogos.length) throw new Error('CSV sem jogos')
        return { jogos: jogos, fonte: 'ao-vivo' }
      })
      .catch(function () {
        return { jogos: processarCSV(SNAPSHOT_CSV), fonte: 'snapshot' }
      })
      .finally(function () { clearTimeout(timer) })
  }

  var Dados = { carregar: carregar, processarCSV: processarCSV }

  // Snapshot da planilha (só colunas C..G), usado quando a busca ao vivo falha.
  // Gerado com JSON.stringify a partir do CSV; para atualizar, regenere em vez de editar à mão.
  var SNAPSHOT_CSV = "\"Nome do Aluno:\",\"Nome do Jogo:\",\"Sínopse do Jogo:\",\"Gênero do Jogo:\",\"Link do Jogo:\"\n\"Evelyn de Oliveira Folmann\",\"Escolha seu estilo\",\"Escolha seu estilo, vista roupas e se divirta com cada tema e cada roupa\",\"Ação\",\"https://scratch.mit.edu/projects/1392543092\"\n\"Endril Luiz Ronchi\",\"hollow knight\",\"Hollow Knight é um jogo de aventura e exploração em 2D que se passa em Hallownest, um reino subterrâneo habitado por insetos que foi tomado pela ruína e por uma misteriosa infecção.\n\nVocê controla um pequeno cavaleiro silencioso que viaja por cavernas sombrias, cidades abandonadas e ruínas antigas, enfrentando criaturas perigosas e chefes poderosos. Durante sua jornada, ele descobre segredos sobre o passado do reino, a origem da infecção e o destino de seus habitantes.\n\nCom combates desafiadores, habilidades especiais e um mundo cheio de mistérios, o cavaleiro precisa desvendar a verdade por trás da queda de Hallownest e descobrir qual é o seu verdadeiro papel nessa história.\",\"Ação\",\"https://scratch.mit.edu/projects/1374808095/editor\"\n\"Marlon Palhano Gonçalves\",\"Baskete\",\"meu jogo é um jogo de baskete criado para fazer arremessos,quando vc erra o arremesso vc perde uma vida,quando vc acerta vc ganha um ponto.\",\"Esportes\",\"https://scratch.mit.edu/projects/1381073058/editor\"\n\"Rennielys Carolina\",\"roubaram a minha pizza\",\"É um jogo simples, consiste em o personagem principal,onde ele basicamente anda por todo um restaurante depizza em busca de quem foi a pessoa que roubou a sua pizza, mas no caminho ele encontra gente meio estrnha com queal ele terá que lidar caso queira a sua pizza de volta. \",\"Aventura\",\"https://scratch.mit.edu/projects/1374811538\"\n\"Jorge\",\"Arremesso de basquete\",\"Meu jogo é um jogo de arremessos de bola de basquete na cesta,quando erra você perde uma vida,e quando acerta adiciona um a ponto.\",\"Esportes\",\"https://scratch.mit.edu/projects/1393323552/editor\"\n\"Gabriela Vitória Urmann\",\"O combate: Cabo de guerra\",\"O jogo de combate sobre o cabo de guerra, mostra dois personagens (gatos), batalhando entre si pela vitória, uma corda, dois personagens e um objetivo final. Jogo simples, porém com muita diversão, recomendado a jogar entre amigos. \",\"Esportes\",\"https://scratch.mit.edu/projects/1388333908/editor\"\n\"eric de souza de chaves\",\"guerra infinita\",\"esse jogo, e sobre um personagem que seria de inicio um vilao, mas acabou sendo atacado, e acabaria tendo que se esquivar de ataques de seus inimigos.\",\"Ação\",\"https://scratch.mit.edu/projects/1385854307\"\n\"Angelo\",\"Parkour\",\"É um jogo de aventura, com plataformas igual um de parkour\n\",\"Aventura\",\"https://scratch.mit.edu/projects/1374812789\"\n\"Dyovan Simoes Morais\",\"Basquetebol\",\"meu jogo é um jogo de Basquete com dois jogadores arremessando  para a sesta de basquete \n\",\"Esportes\",\"https://scratch.mit.edu/projects/1381072963/editor\"\n\"Ezequiel\",\"Savage Clash\",\"           O jogo basicamente se trata de ação, melhor dizendo, luta. Seria um dinossauro controlável que luta contra um urso, que parece ter muita vida. A cada 5 segundos o urso aparece em um lugar aleatório, e se ele aparece perto de seu dinossauro você leva dano ( Perde vida ), o urso tem 100 vidas, ou seja, você precisa acertar 100 tiros nele para ele morrer.\",\"Ação\",\"https://scratch.mit.edu/projects/1393322260\"\n\"Davi Eliezer\",\"bandeira capiturada\",\"O gato captura a bandeira.\",\"Ação\",\"https://scratch.mit.edu/projects/1366312106\"\n\"Marcos Emanuel\",\"street fighter \",\"O Street Fighter é uma famosa franquia de jogos eletrônicos de luta desenvolvida pela Capcom, iniciada em 1987.\",\"Ação\",\"https://scratch.mit.edu/projects/1388335192\"\n\"David\",\"vale do fim\",\"é um jogo de luta \",\"Ação\",\"https://scratch.mit.edu/projects/1388338161\"\n\"ygor\",\"luta\",\"e um jogo\",\"Ação\",\"jogavel\"\n\"Davi Pitt\",\"Pesca Divertida\",\"Seria um jogo de ação cujo tem de pegar peixes para mudar de cenário. \nCada peixe tem sua pontuação e vida o caranguejo perde vida e os outros adicionam pontos variados  como o tubarão aumenta 10 o peixe 1 a estrela do mar 5 e o baiacu 3.\",\"Esportes\",\"https://scratch.mit.edu/projects/1374812775\"\n\"david\",\"vale do fim\",\"naruto contra sasuke jogar poder e esquivar se acertar o outro tira vida\",\"Ação\",\"https://scratch.mit.edu/projects/1388338161\"\n\"jorge\",\"Basquete\",\"O arremesso é um dos fundamentos mais importantes do basquete, pois é por meio dele que os jogadores tentam marcar pontos para sua equipe. Ele consiste em lançar a bola em direção à cesta, utilizando técnica, precisão, força e concentração. Existem diferentes tipos de arremesso, como o arremesso parado, o de três pontos, o lance livre e a bandeja. Para realizar um bom arremesso, é importante manter o equilíbrio do corpo, posicionar corretamente as mãos e acompanhar o movimento da bola até a cesta. A prática constante ajuda a desenvolver a habilidade e a melhorar o desempenho durante o jogo.\n\n\n\n\",\"Esportes\",\"https://scratch.mit.edu/projects/1393323552\"\n\"Dyovan\",\"Basquete \",\"O basquete é um esporte coletivo cheio de emoção, agilidade e trabalho em equipe, no qual duas equipes competem para marcar pontos arremessando a bola na cesta adversária. Durante o jogo, os jogadores utilizam habilidades como dribles, passes, arremessos e estratégias de defesa para superar os adversários. Mais do que uma competição, o basquete ensina valores importantes, como respeito, disciplina, cooperação e perseverança. Vence a equipe que marcar mais pontos ao final da partida.\",\"Esportes\",\"https://scratch.mit.edu/projects/1381072963\"\n\"Miguel\",\"nexora\",\"é um jogo baseado em tenis de mesa e objetivo é fazer o maximo de pontos que voce conseguir\",\"Esportes\",\"https://scratch.mit.edu/projects/1388344980\"\n\"Kemilly\",\"magia\",\"faz magia e quando fala 123 aparece as coisas\",\"Aventura\",\"https://scratch.mit.edu/projects/1388360371\""

  root.Dados = Dados
  if (typeof module === 'object' && module.exports) module.exports = Dados
})(typeof window !== 'undefined' ? window : globalThis)
