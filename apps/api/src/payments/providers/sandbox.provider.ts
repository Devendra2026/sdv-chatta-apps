import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentGatewayProvider,
  RefundInput,
  RefundResult,
  RequeryInput,
  RequeryResult,
} from "./payment-provider"

/** Local sandbox provider for development without Atom credentials. */
export class SandboxPaymentProvider implements PaymentGatewayProvider {
  readonly name = "sandbox"

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const redirectUrl = `${process.env.ATOM_RETURN_URL ?? "http://localhost:3000/payments/return"}?merchTxnId=${encodeURIComponent(input.merchTxnId)}&sandbox=1`
    return {
      redirectUrl,
      merchId: "SANDBOX",
      encData: Buffer.from(JSON.stringify(input)).toString("base64"),
      raw: { provider: "sandbox", input },
    }
  }

  async requery(input: RequeryInput): Promise<RequeryResult> {
    return {
      statusCode: "OTS0000",
      success: true,
      atomTxnId: `SANDBOX-${input.merchTxnId}`,
      amount: undefined,
      raw: { provider: "sandbox", merchTxnId: input.merchTxnId },
    }
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    return {
      statusCode: "OTS0000",
      success: true,
      gatewayRefundId: `RFD-${input.merchTxnId}`,
      raw: { provider: "sandbox", input },
    }
  }
}
