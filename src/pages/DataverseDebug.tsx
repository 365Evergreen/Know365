import { useState } from 'react'
import { PrimaryButton, DefaultButton, TextField } from '@fluentui/react'
import { listEntitySets, getEntityRecords, getKnowledgeArticlesBySubject } from '../services/dataverseClient'

export default function DataverseDebug(): JSX.Element {
  const [entitySets, setEntitySets] = useState<string[] | null>(null)
  const [selectedSet, setSelectedSet] = useState('')
  const [records, setRecords] = useState<any[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [subject, setSubject] = useState('')
  const [articleResults, setArticleResults] = useState<any[] | null>(null)

  const loadEntitySets = async () => {
    setError(null)
    try {
      const sets = await listEntitySets()
      setEntitySets(sets)
    } catch (err: any) {
      setError(err?.message || String(err))
    }
  }

  const fetchRecords = async () => {
    setError(null)
    setRecords(null)
    try {
      if (!selectedSet) throw new Error('Please enter an entity set name')
      const res = await getEntityRecords(selectedSet)
      setRecords(res || [])
    } catch (err: any) {
      setError(err?.message || String(err))
    }
  }

  const lookupArticles = async () => {
    setError(null)
    setArticleResults(null)
    try {
      if (!subject) throw new Error('Please enter a subject string')
      const res = await getKnowledgeArticlesBySubject(subject)
      setArticleResults(res || [])
    } catch (err: any) {
      setError(err?.message || String(err))
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Dataverse Debug</h2>
      <p>Use this page to discover entity set names and run quick queries against your Dataverse instance.</p>

      <div style={{ marginBottom: 12 }}>
        <PrimaryButton text="List entity sets" onClick={loadEntitySets} />
        <DefaultButton text="Clear" onClick={() => { setEntitySets(null); setRecords(null); setError(null) }} style={{ marginLeft: 8 }} />
      </div>

      {entitySets && (
        <div style={{ marginBottom: 16 }}>
          <strong>Entity sets:</strong>
          <div style={{ maxHeight: 220, overflow: 'auto', border: '1px solid #ddd', padding: 8 }}>
            {entitySets.map(s => (
              <div key={s} style={{ padding: 4 }}>
                <code>{s}</code>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <TextField label="Entity set name to query" value={selectedSet} onChange={(_, v) => setSelectedSet(v || '')} />
        <PrimaryButton text="Fetch records" onClick={fetchRecords} style={{ marginTop: 8 }} />
      </div>

      {records && (
        <div style={{ marginBottom: 16 }}>
          <strong>Records (first 50):</strong>
          <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 260, overflow: 'auto', border: '1px solid #eee', padding: 8 }}>
            {JSON.stringify(records.slice(0, 50), null, 2)}
          </pre>
        </div>
      )}

      <hr />

      <div style={{ marginTop: 16 }}>
        <TextField label="Subject string (to test KnowledgeArticles lookup)" value={subject} onChange={(_, v) => setSubject(v || '')} />
        <PrimaryButton text="Lookup articles by subject" onClick={lookupArticles} style={{ marginTop: 8 }} />
      </div>

      {articleResults && (
        <div style={{ marginTop: 12 }}>
          <strong>Article results (first 50):</strong>
          <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 260, overflow: 'auto', border: '1px solid #eee', padding: 8 }}>
            {JSON.stringify(articleResults.slice(0, 50), null, 2)}
          </pre>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 12, color: 'crimson' }}>
          <strong>Error:</strong>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{error}</pre>
        </div>
      )}
    </div>
  )
}
