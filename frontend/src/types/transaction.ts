export type TransactionType =
  | 'buy'
  | 'sell'
  | 'dividend'
  | 'interest'
  | 'deposit'
  | 'withdrawal'
  | 'transfer_in'
  | 'transfer_out'
  | 'fee'
  | 'tax'
  | 'split'
  | 'merger'

export interface Transaction {
  id: string
  org_id: string
  portfolio_id: string
  portfolio_name: string
  asset_id?: string
  asset_name?: string
  asset_symbol?: string
  transaction_type: TransactionType
  trade_date: string
  settle_date?: string
  quantity: number
  price: number
  gross_amount: number
  commission: number
  tax: number
  net_amount: number
  currency: string
  account?: string
  notes?: string
  external_id?: string
  created_at: string
  updated_at: string
}

export interface CreateTransactionInput {
  portfolio_id: string
  asset_id?: string
  transaction_type: TransactionType
  trade_date: string
  settle_date?: string
  quantity: number
  price: number
  commission?: number
  tax?: number
  currency: string
  account?: string
  notes?: string
  external_id?: string
}

export interface UpdateTransactionInput extends Partial<CreateTransactionInput> {
  id: string
}

export interface ImportJob {
  id: string
  org_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  file_name: string
  file_size: number
  total_rows: number
  imported_rows: number
  error_rows: number
  errors: ImportError[]
  created_at: string
  completed_at?: string
}

export interface ImportError {
  row: number
  field?: string
  message: string
}

export interface ImportPreviewRow {
  row_number: number
  data: Record<string, string>
  errors: ImportError[]
  is_valid: boolean
}
