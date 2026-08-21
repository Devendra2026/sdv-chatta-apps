export type CreatePaymentInput = {
  merchTxnId: string
  amount: number
  customerName?: string
  customerEmail?: string
  customerMobile?: string
  returnUrl: string
  callbackUrl: string
}

export type CreatePaymentResult = {
  redirectUrl?: string
  encData?: string
  merchId?: string
  raw?: unknown
}

export type RequeryInput = {
  merchTxnId: string
}

export type RequeryResult = {
  statusCode: string
  success: boolean
  atomTxnId?: string
  amount?: number
  raw: unknown
}

export type RefundInput = {
  merchTxnId: string
  atomTxnId: string
  amount: number
  reason?: string
}

export type RefundResult = {
  statusCode: string
  success: boolean
  gatewayRefundId?: string
  raw: unknown
}

export interface PaymentGatewayProvider {
  readonly name: string
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>
  requery(input: RequeryInput): Promise<RequeryResult>
  refund(input: RefundInput): Promise<RefundResult>
}
