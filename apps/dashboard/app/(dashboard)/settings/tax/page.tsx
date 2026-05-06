'use client'

import { useState } from 'react'
import { Save, Plus, Trash2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

/* ───────────────── types ───────────────── */

interface TaxIdRow {
  id: string
  jurisdiction: string
  taxId: string
}

/* ───────────────── component ───────────────── */

export default function TaxSettingsPage() {
  const [vatRate, setVatRate] = useState<string>('0')
  const [taxIds, setTaxIds] = useState<TaxIdRow[]>([
    { id: crypto.randomUUID(), jurisdiction: '', taxId: '' },
  ])
  const [saving, setSaving] = useState(false)

  /* ── helpers ── */

  const addRow = () => {
    setTaxIds((prev) => [
      ...prev,
      { id: crypto.randomUUID(), jurisdiction: '', taxId: '' },
    ])
  }

  const removeRow = (id: string) => {
    setTaxIds((prev) => prev.filter((r) => r.id !== id))
  }

  const updateRow = (id: string, field: keyof Omit<TaxIdRow, 'id'>, value: string) => {
    setTaxIds((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    )
  }

  const handleSave = async () => {
    const rate = parseFloat(vatRate)
    if (isNaN(rate) || rate < 0 || rate > 50) {
      toast.error('VAT rate must be between 0% and 50%')
      return
    }

    setSaving(true)

    // Hackathon stub -- no backend integration yet
    await new Promise((r) => setTimeout(r, 600))

    toast.success('Tax settings saved (local only -- backend pending)')
    setSaving(false)
  }

  /* ── render ── */

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Tax Settings</h1>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-lg border border-border bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>
          Tax calculations are applied to new invoices only. Existing invoices
          will not be affected by changes made here.
        </span>
      </div>

      {/* VAT rate */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="font-medium">Default VAT / Tax Rate</h3>
        <p className="text-sm text-muted-foreground">
          Set a default tax rate that will be applied to new invoices. You can
          override this per invoice.
        </p>

        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={50}
            step={0.1}
            value={vatRate}
            onChange={(e) => setVatRate(e.target.value)}
            className="input-base w-28 text-right"
            placeholder="0"
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>
      </div>

      {/* Tax ID rows */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="font-medium">Tax Identification Numbers</h3>
        <p className="text-sm text-muted-foreground">
          Add your tax IDs for each jurisdiction where you are registered.
        </p>

        <div className="space-y-3">
          {taxIds.map((row) => (
            <div
              key={row.id}
              className="flex flex-col gap-2 sm:flex-row sm:items-center"
            >
              <input
                type="text"
                placeholder="Jurisdiction (e.g. US, EU)"
                value={row.jurisdiction}
                onChange={(e) =>
                  updateRow(row.id, 'jurisdiction', e.target.value)
                }
                className="input-base sm:w-40"
                maxLength={40}
              />
              <input
                type="text"
                placeholder="Tax ID"
                value={row.taxId}
                onChange={(e) => updateRow(row.id, 'taxId', e.target.value)}
                className="input-base flex-1"
                maxLength={60}
              />
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                disabled={taxIds.length <= 1}
                className="btn-ghost shrink-0 text-danger hover:text-danger disabled:text-muted-foreground"
                title="Remove row"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <button type="button" onClick={addRow} className="btn-secondary text-sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Tax ID
        </button>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary"
      >
        <Save className="mr-2 h-4 w-4" />
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  )
}
