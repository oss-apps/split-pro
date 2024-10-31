declare module 'nordigen-node' {
  interface Transaction {
    transactionId: string;
    entryReference: string;
    bookingDate: string;
    valueDate: string;
    transactionAmount: {
      amount: string
      currency: string
    }
    remittanceInformationUnstructured: string;
    remittanceInformationStructured: string;
    additionalInformation: string;
    internalTransactionId: string;
  }

  interface GetTransactions {
    transactions: {
      booked: Transaction[]
      pending: Transaction[]
    }
  }

  interface Requisition {
    id: string,
    created: string,
    redirect: string,
    status: string,
    institution_id: string,
    agreement?: string,
    reference: string,
    accounts: string[],
    user_language: string,
    link: string,
    ssn: string | null,
    account_selection: boolean,
    redirect_immediate: boolean
  }

  interface Account {
    getTransactions(): Promise<GetTransactions>;
  }

  interface Init {
    id: string
    link: string
  }

  interface Institution {
    id: string
    name: string
    bic: string
    transaction_total_days: string
    countries: string[]
    logo: string
  }

  export default class NordigenClient {
    constructor(options: {
      secretId?: string;
      secretKey?: string;
    });

    generateToken(): Promise<void>
    account(accountId: string): Account
    initSession({
      redirectUrl: string,
      institutionId: string,
      referenceId: string,
      user_language: string,
      redirect_immediate: boolean,
      account_selection: boolean,
    }): Promise<Init>

    requisition: {
      getRequisitionById(requisitionId: string): Promise<Requisition>;
    };

    institution: {
      getInstitutions(options?: {country?: string}): Promise<Institution[]>;
    };
  }
}
