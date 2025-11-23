'use server';

import { ID, Client, Account, AppwriteException } from "node-appwrite";
import { createSessionClient, createAdminClient } from "../appwrite";
import { cookies } from "next/headers";
import { parseStringify } from "../utils";
import { email } from "zod";



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

    return parseStringify(session);
  } catch (error) {
    console.error("SERVER signIn error:", error);
    throw error;
  }
};


export const signUp = async (userData: SignUpParams) => {
  const { email, password, firstName, lastName } = userData;

  console.log("SERVER signUp called with:", userData);

  try {
    const { account: adminAccount } = await createAdminClient();

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

    // 2️⃣ Create session with ADMIN account (so we get secret)
    const session = await adminAccount.createEmailPasswordSession(email, password);

    console.log("SERVER session created:", {
      id: session.$id,
      hasSecret: !!session.secret,
    });

    const isProd = process.env.NODE_ENV === "production";
    const cookieStore = await cookies();

    // ⭐ Store the session SECRET
    cookieStore.set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
    });

    console.log("SERVER cookie set with secret length:", session.secret?.length);

    // 3️⃣ Return the created user (or the auth user if already existed)
    return parseStringify(newUserAccount ?? (await adminAccount.get()));
  } catch (error) {
    console.error("SERVER signUp error:", error);
    throw error;
  }
};

export async function getLoggedInUser() {
  try {
    console.log("SERVER cookies:", await cookies())
    const { account } = await createSessionClient();
    const user = await account.get();

    return {
      name: user.name,
      email: user.email,
    };
  } catch (error) {
    console.error("getLoggedInUser error:", error);
    return null;
  }
}

export const logoutAccount = async ()=>{
  try {
    const {account} = await createSessionClient();
    const cookieStore = await cookies();
    cookieStore.delete('appwrite-session');
    await account.deleteSession('current');
  } catch (error) {
    return null;
  }
}


