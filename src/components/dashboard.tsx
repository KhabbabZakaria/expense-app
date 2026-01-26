import { useState } from 'react'
import { EXPENSE_TYPES } from '../consts/expenseTypes'
import type { ExpenseEntry, ExpenseType } from '../types/expense'
import { readCSV, toCSV } from '../utils/fsCsv'
import './Dashboard.css'
import Header from './Header.tsx'

function Dashboard() {
  const [month, setMonth] = useState('')
  const [type, setType] = useState<ExpenseType>('rent')
  const [amount, setAmount] = useState<string>('') // string to avoid leading 0
  const [miscType, setMiscType] = useState('')
  const [entries, setEntries] = useState<ExpenseEntry[]>([])
  const [directoryHandle, setDirectoryHandle] =
    useState<FileSystemDirectoryHandle | null>(null)

  // --- Modal state for editing ---
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [editType, setEditType] = useState<ExpenseType>('rent')
  const [editAmount, setEditAmount] = useState<string>('')
  const [editMiscType, setEditMiscType] = useState('')

  // ---- Select local folder ----
  const selectFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker()
      setDirectoryHandle(handle)
    } catch {
      console.log('Folder selection cancelled')
    }
  }

  // ---- Add Expense ----
  const handleAddExpense = () => {
    const numericAmount = Number(amount)
    if (!numericAmount || numericAmount <= 0) return

    const subtype = type === 'misc extra' ? miscType.trim() : undefined

    setEntries((prev) => {
      const existingIndex = prev.findIndex(
        (e) => e.type === type && e.subtype === subtype
      )

      if (existingIndex !== -1) {
        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          amount: updated[existingIndex].amount + numericAmount,
        }
        return updated
      }

      return [
        ...prev,
        {
          type,
          subtype,
          amount: numericAmount,
        },
      ]
    })

    setAmount('')
    setMiscType('')
  }

  // ---- Delete Expense ----
  const handleDelete = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index))
  }

  // ---- Open Edit Modal ----
  const handleEdit = (index: number) => {
    const entry = entries[index]
    setEditIndex(index)
    setEditType(entry.type)
    setEditAmount(entry.amount.toString())
    setEditMiscType(entry.subtype || '')
    setIsEditOpen(true)
  }

  // ---- Save Edited Expense ----
  const handleSaveEdit = () => {
    if (editIndex === null) return
    const numericAmount = Number(editAmount)
    if (!numericAmount || numericAmount <= 0) return

    const subtype = editType === 'misc extra' ? editMiscType.trim() : undefined

    setEntries((prev) => {
      const updated = [...prev]
      updated[editIndex] = {
        type: editType,
        subtype,
        amount: numericAmount,
      }
      return updated
    })

    setIsEditOpen(false)
    setEditIndex(null)
  }

  // ---- Submit / Save CSV ----
  const handleSubmit = async () => {
    if (!directoryHandle) {
      alert('Please select a folder first')
      return
    }

    if (entries.length === 0) {
      alert('Please add at least one expense')
      return
    }

    const fileName = `${month}.csv`
    let fileHandle: FileSystemFileHandle

    try {
      fileHandle = await directoryHandle.getFileHandle(fileName)
    } catch {
      fileHandle = await directoryHandle.getFileHandle(fileName, {
        create: true,
      })
    }

    let mergedEntries = [...entries]

    try {
      const existing = await readCSV(fileHandle)
      existing.forEach((old) => {
        const idx = mergedEntries.findIndex(
          (e) => e.type === old.type && e.subtype === old.subtype
        )
        if (idx !== -1) {
          mergedEntries[idx].amount += old.amount
        } else {
          mergedEntries.push(old)
        }
      })
    } catch {
      // file empty or new, ignore
    }

    const writable = await fileHandle.createWritable()
    await writable.write(toCSV(month, mergedEntries))
    await writable.close()

    alert(`Saved ${fileName} successfully`)
    setEntries([])
  }

  // ---- Button disabled logic ----
  const isAddDisabled =
    !amount || Number(amount) <= 0 || (type === 'misc extra' && !miscType.trim())

  const isSubmitDisabled =
    !month || !directoryHandle || entries.length === 0

  return (
    <>
      <Header />

      <div className="dashboard-container">
        <div className="card">
          <h1 className="title">Monthly Expenses</h1>

          <button className="secondary-btn" onClick={selectFolder}>
            Select Expenses Folder
          </button>

          <div className="form-grid">
            <div className="field">
              <label>Month</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Expense Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ExpenseType)}
              >
                {EXPENSE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {type === 'misc extra' && (
              <div className="field">
                <label>Misc Type</label>
                <input
                  type="text"
                  placeholder="e.g. charger, gift"
                  value={miscType}
                  onChange={(e) => setMiscType(e.target.value)}
                />
              </div>
            )}

            <div className="field">
              <label>Amount (€)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
          </div>

          <button
            className="primary-btn"
            onClick={handleAddExpense}
            disabled={isAddDisabled}
          >
            Add Expense
          </button>

          {/* PREVIEW TABLE */}
          {entries.length > 0 && (
            <table className="expense-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Subtype</th>
                  <th>Amount (€)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, idx) => (
                  <tr key={idx}>
                    <td>{e.type}</td>
                    <td>{e.subtype || '-'}</td>
                    <td>{e.amount.toFixed(2)}</td>
                    <td>
                      <button className="edit-btn" onClick={() => handleEdit(idx)}>Edit</button>
                      <button className="delete-btn" onClick={() => handleDelete(idx)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <button
            className="primary-btn2"
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
          >
            Submit (Save Locally)
          </button>
        </div>
      </div>

      {/* ---- EDIT MODAL ---- */}
      {isEditOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Edit Expense</h2>

            <div className="field">
              <label>Expense Type</label>
              <select
                value={editType}
                onChange={(e) => setEditType(e.target.value as ExpenseType)}
              >
                {EXPENSE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {editType === 'misc extra' && (
              <div className="field">
                <label>Misc Type</label>
                <input
                  type="text"
                  value={editMiscType}
                  onChange={(e) => setEditMiscType(e.target.value)}
                />
              </div>
            )}

            <div className="field">
              <label>Amount (€)</label>
              <input
                type="number"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
              />
            </div>

            <div className="modal-buttons">
              <button onClick={handleSaveEdit}>Save</button>
              <button onClick={() => setIsEditOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Dashboard
