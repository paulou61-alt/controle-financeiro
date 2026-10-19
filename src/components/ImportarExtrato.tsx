import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileUp, Link2 } from 'lucide-react'
import type { Categoria, ContaFinanceira, Lancamento, Tipo } from '../types'
import {
  adivinharColunas, analisar, criarSugestor, lerCSV, lerOFX, transacoesDoCSV,
  type AcaoImportacao, type CSVLido, type MapaColunas, type TransacaoExtrato,
} from '../importacao'
import { formatData, uid } from '../utils'
import { useFmt } from '../ui'
import { Modal } from './comuns'

interface Props {
  contas: ContaFinanceira[]
  contaInicial?: string
  categorias: Categoria[]
  lancamentos: Lancamento[]
  onConcluir: (novos: Lancamento[], baixas: { id: string; data: string; importId: string }[]) => void
  onFechar: () => void
}

interface Linha {
  t: TransacaoExtrato
  tipo: Tipo
  acao: AcaoImportacao
  categoriaId: string
  duplicado?: Lancamento
  pendente?: Lancamento
}

export default function ImportarExtrato({ contas, contaInicial, categorias, lancamentos, onConcluir, onFechar }: Props) {
  const fmt = useFmt()
  const arquivo = useRef<HTMLInputElement>(null)
  const ativas = contas.filter((c) => !c.arquivada)
  const [contaId, setContaId] = useState(ativas.some((c) => c.id === contaInicial) ? contaInicial! : ativas[0]?.id ?? '')
  const conta = contas.find((c) => c.id === contaId)
  const cartao = conta?.tipo === 'cartao'
  const [nomeArquivo, setNomeArquivo] = useState('')
  const [transacoes, setTransacoes] = useState<TransacaoExtrato[] | null>(null)
  const [csv, setCsv] = useState<CSVLido | null>(null)
  const [mapa, setMapa] = useState<MapaColunas | null>(null)
  const [inverter, setInverter] = useState(false)
  const [linhas, setLinhas] = useState<Linha[] | null>(null)
  const [erro, setErro] = useState('')
  const sugerir = useMemo(() => criarSugestor(lancamentos, categorias), [lancamentos, categorias])

  const ler = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setErro('')
    setLinhas(null)
    setNomeArquivo(f.name)
    let texto = await f.text()
    // extratos antigos de bancos vêm em Latin-1
    if (texto.includes('�')) texto = new TextDecoder('iso-8859-1').decode(await f.arrayBuffer())
    if (/<OFX>|OFXHEADER/i.test(texto)) {
      const t = lerOFX(texto)
      if (t.length === 0) return setErro('Não encontramos transações neste arquivo OFX.')
      setCsv(null)
      setMapa(null)
      setTransacoes(t)
      setInverter(false)
    } else {
      const c = lerCSV(texto)
      if (c.linhas.length === 0) return setErro('O arquivo está vazio ou não é um CSV válido.')
      setCsv(c)
      setMapa(adivinharColunas(c))
      setTransacoes(null)
      // em faturas de cartão em CSV, compras costumam vir com valor positivo
      setInverter(cartao)
    }
  }

  const doCsv = csv && mapa ? transacoesDoCSV(csv, mapa) : null
  const brutas = transacoes ?? doCsv
  const mapaValido = !csv || (mapa && mapa.data >= 0 && mapa.descricao >= 0 && (mapa.valor >= 0 || mapa.entrada >= 0 || mapa.saida >= 0))

  const preparar = () => {
    if (!contaId) return setErro('Escolha a conta do extrato.')
    if (!brutas || brutas.length === 0) return setErro('Nenhuma transação válida encontrada. Confira as colunas.')
    const usados = new Set<string>()
    const lista = brutas.map((b) => {
      const t = inverter ? { ...b, valor: -b.valor } : b
      const tipo: Tipo = cartao ? (t.valor < 0 ? 'despesa' : 'receita') : t.valor >= 0 ? 'receita' : 'despesa'
      // no cartão, créditos (pagamentos da fatura, estornos) não viram receita
      const a = analisar(t, contaId, lancamentos, usados)
      if (a.pendente) usados.add(a.pendente.id)
      const acao: AcaoImportacao = a.duplicado || (cartao && tipo === 'receita') ? 'ignorar' : a.pendente ? 'conciliar' : 'criar'
      return { t, tipo, acao, categoriaId: sugerir(t.descricao, tipo), ...a }
    })
    setLinhas(lista)
  }

  const atualizar = (i: number, campos: Partial<Linha>) => setLinhas((ls) => ls!.map((l, k) => (k === i ? { ...l, ...campos } : l)))

  const concluir = () => {
    if (!linhas) return
    const novos: Lancamento[] = []
    const baixas: { id: string; data: string; importId: string }[] = []
    for (const l of linhas) {
      if (l.acao === 'ignorar') continue
      if (l.acao === 'conciliar' && l.pendente) {
        baixas.push({ id: l.pendente.id, data: l.t.data, importId: l.t.idExterno })
        continue
      }
      novos.push({
        id: uid(), tipo: l.tipo, descricao: l.t.descricao, valor: Math.round(Math.abs(l.t.valor) * 100) / 100, data: l.t.data,
        categoriaId: l.categoriaId, contaId, pago: true, dataPagamento: l.t.data, importId: l.t.idExterno,
      })
    }
    onConcluir(novos, baixas)
  }

  const cont = (a: AcaoImportacao) => linhas?.filter((l) => l.acao === a).length ?? 0
  const colunas = csv?.cabecalho ?? []
  const seletorColuna = (rotulo: string, chave: keyof MapaColunas, opcional = false) => (
    <label className="campo">
      <span>{rotulo}</span>
      <select value={mapa?.[chave] ?? -1} onChange={(e) => setMapa({ ...mapa!, [chave]: Number(e.target.value) })} aria-label={rotulo}>
        <option value={-1}>{opcional ? '— não usar —' : '— escolher —'}</option>
        {colunas.map((c, i) => <option key={i} value={i}>{c}</option>)}
      </select>
    </label>
  )

  return (
    <Modal titulo="Importar extrato" onFechar={onFechar} onSubmit={(e) => e.preventDefault()} className="modal-largo">
      {!linhas ? (
        <>
          <p className="ajuda">
            Baixe o extrato no site ou app do seu banco em <strong>OFX</strong> ou <strong>CSV</strong> e envie aqui. Nada é conectado ao banco:
            o arquivo é lido no seu navegador.
          </p>
          <label className="campo">
            <span>Conta ou cartão do extrato</span>
            <select value={contaId} onChange={(e) => { setContaId(e.target.value); setInverter(csv ? contas.find((c) => c.id === e.target.value)?.tipo === 'cartao' : false) }} aria-label="Conta do extrato">
              {ativas.map((c) => <option key={c.id} value={c.id}>{c.nome}{c.tipo === 'cartao' ? ' (cartão)' : ''}</option>)}
            </select>
          </label>
          <button type="button" className="area-arquivo" onClick={() => arquivo.current?.click()}>
            <FileUp size={28} />
            <strong>{nomeArquivo || 'Escolher arquivo OFX ou CSV'}</strong>
            <span>{brutas ? `${brutas.length} transação(ões) encontrada(s)` : 'Clique para selecionar'}</span>
          </button>
          <input ref={arquivo} type="file" accept=".ofx,.csv,.txt,text/csv,application/x-ofx" hidden onChange={ler} aria-label="Arquivo do extrato" />

          {csv && (
            <div className="mapa-colunas">
              <p className="ajuda">Confira quais colunas do arquivo correspondem a cada informação:</p>
              <div className="linha">
                {seletorColuna('Data', 'data')}
                {seletorColuna('Descrição', 'descricao')}
              </div>
              <div className="linha">
                {seletorColuna('Valor', 'valor', true)}
                {seletorColuna('Entrada (crédito)', 'entrada', true)}
                {seletorColuna('Saída (débito)', 'saida', true)}
              </div>
              <label className="interruptor">
                <input type="checkbox" checked={inverter} onChange={(e) => setInverter(e.target.checked)} />
                <span className="trilho"><span /></span>
                Inverter sinais (use se as compras aparecerem como entradas)
              </label>
              {doCsv && doCsv.length > 0 && (
                <p className="kpi-nota">
                  Exemplo: {formatData(doCsv[0].data)} · {doCsv[0].descricao} · {fmt((inverter ? -1 : 1) * doCsv[0].valor)}
                </p>
              )}
            </div>
          )}

          {erro && <p className="erro" role="alert">{erro}</p>}
          <div className="acoes">
            <button type="button" className="btn" onClick={onFechar}>Cancelar</button>
            <button type="button" className="btn primario" onClick={preparar} disabled={!brutas || !mapaValido}>Revisar transações</button>
          </div>
        </>
      ) : (
        <>
          <div className="resumo-import">
            <span className="pilula-status pago"><CheckCircle2 size={14} /> {cont('criar')} nova(s)</span>
            <span className="pilula-status cartao"><Link2 size={14} /> {cont('conciliar')} conciliada(s)</span>
            <span className="pilula-status aberto"><AlertTriangle size={14} /> {cont('ignorar')} ignorada(s)</span>
          </div>
          <p className="ajuda">
            <strong>Conciliar</strong> dá baixa num lançamento pendente que você já tinha cadastrado, em vez de criar outro.
            Transações que parecem repetidas já vêm marcadas para ignorar.
          </p>
          <ul className="lista-import">
            {linhas.map((l, i) => {
              const cats = categorias.filter((c) => c.tipo === l.tipo)
              return (
                <li key={l.t.idExterno} className={`acao-${l.acao}`}>
                  <div className="li-topo">
                    <span className="data">{formatData(l.t.data)}</span>
                    <strong className="li-desc">{l.t.descricao}</strong>
                    <span className={`num mov-valor ${l.tipo}`}>{l.tipo === 'despesa' ? '−' : '+'}{fmt(Math.abs(l.t.valor))}</span>
                  </div>
                  <div className="li-baixo">
                    <select value={l.acao} onChange={(e) => atualizar(i, { acao: e.target.value as AcaoImportacao })} aria-label="Ação">
                      <option value="criar">Criar lançamento</option>
                      {l.pendente && <option value="conciliar">Conciliar com pendente</option>}
                      <option value="ignorar">Ignorar</option>
                    </select>
                    {l.acao === 'criar' && (
                      <select value={l.categoriaId} onChange={(e) => atualizar(i, { categoriaId: e.target.value })} aria-label="Categoria">
                        {cats.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                    )}
                    {l.acao === 'conciliar' && l.pendente && (
                      <span className="li-nota"><Link2 size={13} /> {l.pendente.descricao} · vence {formatData(l.pendente.data)}</span>
                    )}
                    {l.duplicado && <span className="li-nota aviso"><AlertTriangle size={13} /> Parece já lançado: {l.duplicado.descricao}</span>}
                    {cartao && l.tipo === 'receita' && !l.duplicado && <span className="li-nota">Crédito no cartão (pagamento ou estorno)</span>}
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="acoes">
            <button type="button" className="btn" onClick={() => setLinhas(null)}>Voltar</button>
            <button type="button" className="btn primario" onClick={concluir} disabled={cont('criar') + cont('conciliar') === 0}>
              Importar {cont('criar') + cont('conciliar')} transação(ões)
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
