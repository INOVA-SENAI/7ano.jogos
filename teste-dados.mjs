// Teste da camada de dados. Uso: node teste-dados.mjs [--ao-vivo] [--snapshot]
// --snapshot copia a planilha de agora para o SNAPSHOT_CSV de dados.js e depois testa
// (as contagens fixas abaixo vão pedir atualização: confira os jogos novos antes de mudar).
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const arquivo = new URL('./dados.js', import.meta.url)
let fonte = readFileSync(arquivo, 'utf8')
if (process.argv.includes('--snapshot')) {
  const csv = await (await fetch(/var URL_AO_VIVO = '(.*)'/.exec(fonte)[1])).text()
  assert.match(csv, /^"Nome do Aluno/, 'a planilha não respondeu ou as colunas mudaram')
  // Função no replace: um "$&" dentro do CSV não vira padrão de substituição.
  fonte = fonte.replace(/var SNAPSHOT_CSV = "[^\n]*"\n/, () => 'var SNAPSHOT_CSV = ' + JSON.stringify(csv) + '\n')
  writeFileSync(arquivo, fonte)
}
const Dados = createRequire(import.meta.url)('./dados.js')

// Pega o CSV embutido direto do fonte (é o mesmo que carregar() usa no fallback).
const snapshot = JSON.parse(/var SNAPSHOT_CSV = ("[^\n]*")\n/.exec(fonte)[1])
const jogos = Dados.processarCSV(snapshot)
const achar = (autor, titulo) => jogos.find(j => j.autor === autor && j.titulo === titulo)

// Snapshot: 23 linhas -> 19 jogos (4 reenvios pelo mesmo id), chaves únicas, um jogo por aluno.
assert.equal(jogos.length, 19)
assert.equal(new Set(jogos.map(j => j.chave)).size, jogos.length)
assert.equal(new Set(jogos.map(j => j.autor.toLowerCase())).size, jogos.length)

// Link inválido: continua na lista, sem id/url/embed.
const luta = achar('Ygor', 'Luta')
assert.ok(luta)
assert.deepEqual([luta.id, luta.url, luta.embed], [null, null, null])
assert.equal(luta.chave, 'sem-id-ygor-luta')

// Pendente que depois ganha link (mesmo autor e título): fica só a jogável.
const reenviado = Dados.processarCSV('h\nygor,luta,e um jogo,Ação,jogavel\nYgor,Luta,agora vai,Ação,https://scratch.mit.edu/projects/666/editor')
assert.equal(reenviado.length, 1)
assert.equal(reenviado[0].chave, '666')

// Title Case só quando tudo minúsculo.
assert.ok(jogos.some(j => j.autor === 'Eric de Souza de Chaves'))
for (const t of ['Hollow Knight', 'Roubaram a Minha Pizza', 'Street Fighter', 'Escolha seu estilo'])
  assert.ok(jogos.some(j => j.titulo === t), t)

// Duplicata: fica a última (sinopse do naruto), na posição dela.
const vale = jogos.find(j => j.id === '1388338161')
assert.equal(vale.titulo, 'Vale do Fim')
assert.match(vale.sinopse, /naruto/)
assert.equal(jogos.filter(j => j.id === '1388338161').length, 1)
assert.equal(vale.url, 'https://scratch.mit.edu/projects/1388338161/')
assert.equal(vale.embed, 'https://scratch.mit.edu/projects/1388338161/embed')

// Sinopse: trim e no máximo uma linha em branco seguida.
for (const j of jogos) {
  assert.equal(j.sinopse, j.sinopse.trim())
  assert.ok(!/\n{3}/.test(j.sinopse), j.titulo)
}

// Mini-CSV: vírgula, quebra de linha (\n e \r\n), "" dentro de campo; gênero vazio; linha vazia ignorada.
const mini = Dados.processarCSV(
  'Autor,Titulo,Sinopse,Genero,Link\r\n' +
  '"ana  maria","o jogo, parte 2","linha 1\r\nlinha 2\r\n\r\n\r\n\r\nfim ""top""",,https://scratch.mit.edu/projects/42/editor\r\n' +
  ',,sem nome,Ação,\r\n' +
  'Bia,Bia,"a\nb",Ação,https://scratch.mit.edu/projects/7'
)
assert.deepEqual(mini.map(j => [j.autor, j.titulo, j.sinopse, j.genero, j.chave]), [
  ['Ana Maria', 'O Jogo, Parte 2', 'linha 1\nlinha 2\n\nfim "top"', 'Outros', '42'],
  ['Bia', 'Bia', 'a\nb', 'Ação', '7'],
])

// Nenhum e-mail vaza.
for (const j of jogos) for (const v of Object.values(j)) assert.ok(!String(v).includes('@'), v)

// Links maliciosos nunca geram URL fora do Scratch.
const maliciosos = ['javascript:alert(1)', 'https://evil.com/?x=scratch.mit.edu/projects/123',
  'scratch.mit.edu/projects/1"><script>', 'data:text/html,scratch.mit.edu/projects/9', '']
const urlOk = /^https:\/\/scratch\.mit\.edu\/projects\/\d+\/$/
for (const link of maliciosos) {
  const [j] = Dados.processarCSV('h\nfulano,jogo,,,"' + link.replace(/"/g, '""') + '"')
  assert.ok(j.url === null || urlOk.test(j.url), link)
  assert.ok(j.embed === null || j.embed === j.url + 'embed', link)
}

// Fallback: qualquer falha da busca ao vivo cai no snapshot, sem rejeitar.
const csv = conteudo => () => Promise.resolve(new Response(conteudo, { headers: { 'content-type': 'text/csv; charset=utf-8' } }))
const fetchReal = globalThis.fetch
globalThis.fetch = csv(snapshot)
assert.equal((await Dados.carregar()).fonte, 'ao-vivo')
const respostas = [
  () => Promise.reject(new TypeError('rede')),
  () => Promise.resolve(new Response('erro', { status: 500, headers: { 'content-type': 'text/csv' } })),
  () => Promise.resolve(new Response('<!DOCTYPE html><title>Login</title>', { headers: { 'content-type': 'text/html' } })),
  csv('"Nome do Aluno:","Nome do Jogo:"\n'),
  // Coluna inserida antes do e-mail: C passa a ser o e-mail, e não pode ir para a página.
  csv('"Endereço de e-mail","Nome do Aluno:","Nome do Jogo:","Sínopse do Jogo:","Gênero do Jogo:"\nana.souza@escola.br,Ana,Jogo,sinopse,Ação'),
]
for (const resposta of respostas) {
  globalThis.fetch = resposta
  const r = await Dados.carregar()
  assert.equal(r.fonte, 'snapshot')
  assert.equal(r.jogos.length, jogos.length)
}
globalThis.fetch = fetchReal

if (process.argv.includes('--ao-vivo')) {
  const r = await Dados.carregar()
  assert.equal(r.fonte, 'ao-vivo')
  assert.ok(r.jogos.length >= 16, 'vieram ' + r.jogos.length)
  for (const j of r.jogos) for (const v of Object.values(j)) assert.ok(!String(v).includes('@'), v)
  console.log('ao vivo: ' + r.jogos.length + ' jogos')
}

console.log('ok: ' + jogos.length + ' jogos no snapshot')
