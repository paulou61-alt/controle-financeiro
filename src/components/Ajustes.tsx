import { useRef, useState } from 'react'
import type { Backup, Categoria, Lancamento, Orcamentos } from '../types'
import { baixarArquivo, CATEGORIAS_PADRAO, hojeISO } from '../utils'

interface Props {
  categorias: Categoria[]
  lancamentos: Lancamento[]
  orcamentos: Orcamentos
  setCategorias: (c: Categoria[]) => void
  setLancamentos: (l: Lancamento[]) => void
  setOrcamentos: (o: Orcamentos) => void
}

export default function Ajustes({ categorias, lancamentos, orcamentos, setCategorias, setLancamentos, setOrcamentos }: Props) {
  const arquivo = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')

  const exportar = () => {
    const dados: Backup = { versao: 1, categorias, lancamentos, orcamentos }
    baixarArquivo(`controle-financeiro-backup-${hojeISO()}.json`, JSON.stringify(dados, null, 2), 'application/json')
    setMsg('Backup baixado.')
  }

  const importar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      const dados = JSON.parse(await f.text()) as Partial<Backup>
      if (!Array.isArray(dados.categorias) || !Array.isArray(dados.lancamentos)) throw new Error('formato')
      if (!confirm(`Importar ${dados.lancamentos.length} lançamento(s)? Os dados atuais serão substituídos.`)) return
      setCategorias(dados.categorias)
      setLancamentos(dados.lancamentos)
      setOrcamentos(dados.orcamentos ?? {})
      setMsg('Backup restaurado com sucesso.')
    } catch {
      setMsg('Arquivo inválido. Use um backup gerado por este sistema.')
    }
  }

  const apagarTudo = () => {
    if (!confirm('Apagar TODOS os lançamentos, categorias e orçamentos? Isso não pode ser desfeito.')) return
    setLancamentos([])
    setCategorias(CATEGORIAS_PADRAO)
    setOrcamentos({})
    setMsg('Dados apagados.')
  }

  return (
    <div className="grade-2">
      <div className="bloco">
        <h3>Backup</h3>
        <p className="ajuda">
          Os dados ficam guardados apenas neste navegador. Baixe um backup com frequência e use-o para
          levar seus dados para outro computador ou celular.
        </p>
        <p className="ajuda">{lancamentos.length} lançamento(s) · {categorias.length} categoria(s)</p>
        <div className="acoes-esq">
          <button className="btn primario" onClick={exportar}>Baixar backup (.json)</button>
          <button className="btn" onClick={() => arquivo.current?.click()}>Restaurar backup</button>
          <input ref={arquivo} type="file" accept="application/json,.json" hidden onChange={importar} />
        </div>
        {msg && <p className="msg" role="status">{msg}</p>}
      </div>
      <div className="bloco">
        <h3>Zona de perigo</h3>
        <p className="ajuda">Remove todos os dados deste navegador e volta às categorias padrão.</p>
        <button className="btn perigo" onClick={apagarTudo}>Apagar todos os dados</button>
      </div>
    </div>
  )
}
