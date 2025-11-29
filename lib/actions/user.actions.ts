'use server';

import { ID, Client, Account, AppwriteException, Query } from "node-appwrite";
import { createSessionClient, createAdminClient } from "../appwrite";
import { cookies } from "next/headers";
import { encryptId, extractCustomerIdFromUrl, parseStringify } from "../utils";
import { email } from "zod";
import { CountryCode, ProcessorTokenCreateRequest, ProcessorTokenCreateRequestProcessorEnum, Products } from "plaid";
import { plaidClient } from "../plaid";
import { revalidatePath } from "next/cache";
import { addFundingSource, createDwollaCustomer } from "./dwolla.actions";
import { isAxiosError } from "axios";


const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_USER_COLLECTION_ID: USER_COLLECTION_ID,
  APPWRITE_BANK_COLLECTION_ID: BANK_COLLECTION_ID,
} = process.env;

export const getUserInfo = async ({ userId }: getUserInfoProps) => {

  try {

    const { database } = await createAdminClient();
    const user = await database.listDocuments(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      [Query.equal('userId', [userId])]

    )

    return parseStringify(user.documents[0])

  } catch (error) {
    console.log(error)
  }

}


export const signIn = async ({ email, password }: signInProps) => {
  console.log("SERVER signIn called with:", { email });

  try {
    // 🔐 Use ADMIN client so we get a session with a secret
    const { account: adminAccount } = await createAdminClient();

    const session = await adminAccount.createEmailPasswordSession(email, password);

    console.log("SERVER session created:", {
      id: session.$id,
      hasSecret: !!session.secret,
    });

    const isProd = process.env.NODE_ENV === "production";
    const cookieStore = await cookies();

    // ⭐ Store the session SECRET (not $id)
    cookieStore.set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: isProd, // false on localhost
    });

    console.log("SERVER cookie set with secret length:", session.secret?.length);

    const user = await getUserInfo({ userId: session.userId })

    return parseStringify(user);
  } catch (error) {
    console.error("SERVER signIn error:", error);
    throw error;
  }
};


export const signUp = async ({ password, ...userData }: SignUpParams) => {
  const { email, firstName, lastName } = userData;

  console.log("SERVER signUp called with:", userData);

  try {
    const { account: adminAccount, database } = await createAdminClient();

    let newUserAccount;

    try {
      // 1️⃣ Create Appwrite user
      newUserAccount = await adminAccount.create({
        userId: ID.unique(),
        email,
        password,
        name: `${firstName} ${lastName}`,
      });
      console.log("SERVER newUserAccount:", newUserAccount);
    } catch (err: any) {
      if (err instanceof AppwriteException && err.code === 409) {
        console.warn("SERVER signUp: user already exists, continuing to session.");
      } else {
        throw err;
      }
    }

    if (!newUserAccount) throw new Error('Error creating User')

    const dwollaCustomerUrl = await createDwollaCustomer({
      ...userData,
      type: 'personal'
    });

    if (!dwollaCustomerUrl) throw new Error('Error creating Dwolla Customer');

    const dwollaCustomerId = extractCustomerIdFromUrl(dwollaCustomerUrl);

    const newUser = await database.createDocument(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      ID.unique(),
      {
        ...userData,
        userId: newUserAccount.$id,
        dwollaCustomerId,
        dwollaCustomerUrl
      }
    )

    // 2️⃣ Create session with ADMIN account (so we get secret)
    const session = await adminAccount.createEmailPasswordSession(email, password);

    // console.log("SERVER session created:", {
    //   id: session.$id,
    //   hasSecret: !!session.secret,
    // });

    const isProd = process.env.NODE_ENV === "production";
    const cookieStore = await cookies();

    // ⭐ Store the session SECRET
    cookieStore.set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
    });

    // console.log("SERVER cookie set with secret length:", session.secret?.length);

    // 3️⃣ Return the created user (or the auth user if already existed)
    return parseStringify(newUser ?? (await adminAccount.get()));
  } catch (error) {
    console.error("SERVER signUp error:", error);
    throw error;
  }
};

export async function getLoggedInUser() {
  try {
    console.log("SERVER cookies:", await cookies())
    const { account } = await createSessionClient();
    const result = await account.get();

    const user = await getUserInfo({userId:result.$id})

    return {
      user
    };
  } catch (error) {
    console.error("getLoggedInUser error:", error);
    return null;
  }
}

export const logoutAccount = async () => {
  try {
    const { account } = await createSessionClient();
    const cookieStore = await cookies();
    cookieStore.delete('appwrite-session');
    await account.deleteSession('current');
  } catch (error) {
    return null;
  }
}

export const createLinkToken = async (user: User) => {
  try {
    const tokenParams = {
      user: {
        client_user_id: user.$id,
      },
      client_name: `${user.firstName} ${user.lastName}`,
      products: ["auth","transactions"] as Products[],
      language: "en",
      country_codes: ["US"] as CountryCode[],
    };

    const response = await plaidClient.linkTokenCreate(tokenParams);

    console.log("Plaid link_token:", response.data.link_token);

    return { linkToken: response.data.link_token };
  } catch (error: any) {
    // 🔥 THIS is the important part
    if (isAxiosError(error)) {
      console.error(
        "Plaid linkTokenCreate error response:",
        JSON.stringify(error.response?.data, null, 2)
      );
    } else {
      console.error("Unknown error in createLinkToken:", error);
    }

    throw error; // rethrow so you see it clearly
  }
};


export const createBankAccount = async ({

  userId,
  bankId,
  accountId,
  accessToken,
  fundingSourceUrl,
  sharableId,

}: createBankAccountProps) => {
  try {

    const { database } = await createAdminClient();

    const bankAccount = await database.createDocument(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      ID.unique(),
      {
        userId,
        bankId,
        accountId,
        accessToken,
        fundingSourceUrl,
        sharableId,

      }
    )


    return parseStringify(bankAccount)


  } catch (error) {

  }
}

export const exchangePublicToken = async ({
  publicToken,
  user
}: exchangePublicTokenProps) => {
  try {

    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;

    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    const accountData = accountsResponse.data.accounts[0];

    const request: ProcessorTokenCreateRequest = {
      access_token: accessToken,
      account_id: accountData.account_id,
      processor: "dwolla" as ProcessorTokenCreateRequestProcessorEnum,
    };

    const processorTokenResponse = await plaidClient.processorTokenCreate(request);
    const processorToken = processorTokenResponse.data.processor_token;

    const fundingSourceUrl = await addFundingSource({
      dwollaCustomerId: user.dwollaCustomerId,
      processorToken,
      bankName: accountData.name,
    });

    if (!fundingSourceUrl) throw Error;

    await createBankAccount({
      userId: user.$id,
      bankId: itemId,
      accountId: accountData.account_id,
      accessToken,
      fundingSourceUrl,
      sharableId: encryptId(accountData.account_id),
    });

    revalidatePath("/")

    return parseStringify({
      publicTokenExchange: "complete",
    });

  } catch (error) {
    console.log("an error occurred while creating exchanging token:", error);
  }
}


export const getBanks = async ({ userId }: getBanksProps) => {
  // 🛑 Guard: if no userId, don't even hit Appwrite
  if (!userId) {
    console.warn("getBanks called without a valid userId");
    return []; // behave like "no banks"
  }

  try {
    const { database } = await createAdminClient();

    const result = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal("userId", [userId])]
    );

    if (!result.documents || result.documents.length === 0) {
      return [];
    }

    return parseStringify(result.documents);
  } catch (error) {
    console.error("Error in getBanks:", error);
    return [];
  }
};



export const getBank = async ({ documentId }: getBankProps) => {
  try {
    const { database } = await createAdminClient();

    const result = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal("$id", [documentId])]
    );

    // If no document found, return null explicitly
    if (!result.documents || result.documents.length === 0) {
      console.warn(`No bank found for documentId: ${documentId}`);
      return null;
    }

    const bank = result.documents[0];

    return parseStringify(bank);
  } catch (error) {
    console.error("Error in getBank:", error);
    return null;
  }
};


