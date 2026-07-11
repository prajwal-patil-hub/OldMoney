export type TransactionType =
  | 'BUY'
  | 'SELL'
  | 'DIVIDEND'
  | 'INTEREST'
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'FEE'
  | 'TAX'
  | 'SPLIT'
  | 'MERGER'

export interface Transaction {
  id: string
  org_id: string
  account_id: string
  portfolio_id: string
  asset_id?: string
  asset_symbol?: string // populated by the dashboard recent-transactions endpoint
  transaction_type: TransactionType
  trade_date: string
  settlement_date?: string
  quantity?: number
  price?: number
  gross_amount?: number
  fees: number
  net_amount?: number
  currency: string
  notes?: string
  external_id?: string
  created_at: string
}

export interface CreateTransactionInput {
  account_id?: string
  portfolio_id: string
  asset_id?: string
  transaction_type: TransactionType
  trade_date: string
  settlement_date?: string
  quantity?: number
  price?: number
  gross_amount?: number
  fees?: number
  net_amount?: number
  currency: string
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
