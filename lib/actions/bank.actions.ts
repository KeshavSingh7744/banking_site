"use server";

import {
  ACHClass,
  CountryCode,
  TransferAuthorizationCreateRequest,
  TransferCreateRequest,
  TransferNetwork,
  TransferType,
} from "plaid";

import { isAxiosError } from "axios";

import { plaidClient } from "../plaid";
import { parseStringify } from "../utils";

// import { getTransactionsByBankId } from "./transaction.actions";
import { getBanks, getBank } from "./user.actions";

// Get multiple bank accounts
export const getAccounts = async ({ userId }: getAccountsProps) => {
  try {
    // get banks from db
    const banks = await getBanks({ userId });

    const accounts = await Promise.all(
      banks?.map(async (bank: Bank) => {
        // get each account info from plaid
        const accountsResponse = await plaidClient.accountsGet({
          access_token: bank.accessToken,
        });
        const accountData = accountsResponse.data.accounts[0];

        // get institution info from plaid
        const institution = await getInstitution({
          institutionId: accountsResponse.data.item.institution_id!,
        });

        const account = {
          id: accountData.account_id,
          availableBalance: accountData.balances.available!,
          currentBalance: accountData.balances.current!,
          institutionId: institution.institution_id,
          name: accountData.name,
          officialName: accountData.official_name,
          mask: accountData.mask!,
          type: accountData.type as string,
          subtype: accountData.subtype! as string,
          appwriteItemId: bank.$id,
          sharableId: bank.sharableId,
        };

        return account;
      })
    );

    const totalBanks = accounts.length;
    const totalCurrentBalance = accounts.reduce((total, account) => {
      return total + account.currentBalance;
    }, 0);

    return parseStringify({ data: accounts, totalBanks, totalCurrentBalance });
  } catch (error) {
    console.error("An error occurred while getting the accounts:", error);
  }
};

// Get one bank account
export const getAccount = async ({ appwriteItemId }: getAccountProps) => {
    try {
      const bank = await getBank({ documentId: appwriteItemId });
  
      if (!bank) {
        // No bank found in Appwrite
        return parseStringify({
          data: null,
          error: `Bank not found for id: ${appwriteItemId}`,
        });
      }
  
      const accountsResponse = await plaidClient.accountsGet({
        access_token: bank.accessToken,
      });
      const accountData = accountsResponse.data.accounts[0];
  
      const institution = await getInstitution({
        institutionId: accountsResponse.data.item.institution_id!,
      });
  
      const transactions = await getTransactions({
        accessToken: bank.accessToken,
      });
  
      const account = {
        id: accountData.account_id,
        availableBalance: accountData.balances.available!,
        currentBalance: accountData.balances.current!,
        institutionId: institution.institution_id,
        name: accountData.name,
        officialName: accountData.official_name,
        mask: accountData.mask!,
        type: accountData.type as string,
        subtype: accountData.subtype! as string,
        appwriteItemId: bank.$id,
      };
  
      return parseStringify({
        data: account,
        transactions, // you can add this back later
      });
    } catch (error) {
      console.error("An error occurred while getting the account:", error);
  
      return parseStringify({
        data: null,
        error: "Failed to fetch account",
      });
    }
  };
  
  

// Get bank info
export const getInstitution = async ({
  institutionId,
}: getInstitutionProps) => {
  try {
    const institutionResponse = await plaidClient.institutionsGetById({
      institution_id: institutionId,
      country_codes: ["US"] as CountryCode[],
    });

    const intitution = institutionResponse.data.institution;

    return parseStringify(intitution);
  } catch (error) {
    console.error("An error occurred while getting the accounts:", error);
  }
};

// Get transactions


export const getTransactions = async ({
  accessToken,
}: getTransactionsProps) => {
  let hasMore = true;
  let transactions: any[] = [];

  try {
    while (hasMore) {
      const response = await plaidClient.transactionsSync({
        access_token: accessToken,
        // later you can add cursor
      });

      const data = response.data;

      const newTxns = data.added.map((transaction) => {
        // 1) Prefer new-style Plaid category
        const pfcPrimary =
          transaction.personal_finance_category?.primary || undefined;

        // 2) Then old array category
        const legacyCategory =
          Array.isArray(transaction.category) &&
          transaction.category.length > 0
            ? transaction.category[0]
            : undefined;

        // 3) Final category string we store
        const category =
          pfcPrimary ??
          legacyCategory ??
          "Uncategorized";

        return {
          id: transaction.transaction_id,
          name: transaction.name,
          paymentChannel: transaction.payment_channel,
          // (still using payment_channel as type for now)
          type: transaction.payment_channel,
          accountId: transaction.account_id,
          amount: transaction.amount,
          pending: transaction.pending,
          category,
          date: transaction.date,
          image: transaction.logo_url,
        };
      });

      transactions = [...transactions, ...newTxns];
      hasMore = data.has_more;
    }

    return parseStringify(transactions);
  } catch (error: any) {
    if (isAxiosError(error)) {
      console.error(
        "Plaid transactionsSync error:",
        JSON.stringify(error.response?.data, null, 2)
      );
    } else {
      console.error("An error occurred while getting transactions:", error);
    }

    return parseStringify([]);
  }
};




// Create Transfer
// export const createTransfer = async () => {
//   const transferAuthRequest: TransferAuthorizationCreateRequest = {
//     access_token: "access-sandbox-cddd20c1-5ba8-4193-89f9-3a0b91034c25",
//     account_id: "Zl8GWV1jqdTgjoKnxQn1HBxxVBanm5FxZpnQk",
//     funding_account_id: "442d857f-fe69-4de2-a550-0c19dc4af467",
//     type: "credit" as TransferType,
//     network: "ach" as TransferNetwork,
//     amount: "10.00",
//     ach_class: "ppd" as ACHClass,
//     user: {
//       legal_name: "Anne Charleston",
//     },
//   };
//   try {
//     const transferAuthResponse =
//       await plaidClient.transferAuthorizationCreate(transferAuthRequest);
//     const authorizationId = transferAuthResponse.data.authorization.id;

//     const transferCreateRequest: TransferCreateRequest = {
//       access_token: "access-sandbox-cddd20c1-5ba8-4193-89f9-3a0b91034c25",
//       account_id: "Zl8GWV1jqdTgjoKnxQn1HBxxVBanm5FxZpnQk",
//       description: "payment",
//       authorization_id: authorizationId,
//     };

//     const responseCreateResponse = await plaidClient.transferCreate(
//       transferCreateRequest
//     );

//     const transfer = responseCreateResponse.data.transfer;
//     return parseStringify(transfer);
//   } catch (error) {
//     console.error(
//       "An error occurred while creating transfer authorization:",
//       error
//     );
//   }
// };


