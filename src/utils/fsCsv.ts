import type { ExpenseEntry } from '../types/expense'

export async function readCSV(
  fileHandle: FileSystemFileHandle
): Promise<ExpenseEntry[]> {
  const file = await fileHandle.getFile()
  const text = await file.text()

  const [, ...lines] = text.split('\n')

  return lines
    .filter(Boolean)
    .map((line) => {
      const [, type, subtype, amount] = line.split(',')
      return {
        type: type as any,
        subtype: subtype || undefined,
        amount: Number(amount),
      }
    })
}

export function toCSV(
  month: string,
  entries: ExpenseEntry[]
): string {
  const header = 'month,type,subtype,amount'
  const rows = entries.map((e) =>
    [month, e.type, e.subtype ?? '', e.amount].join(',')
  )
  return [header, ...rows].join('\n')
}
