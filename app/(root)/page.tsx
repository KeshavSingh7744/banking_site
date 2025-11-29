import HeaderBox from "@/components/HeaderBox";
import RecentTransactions from "@/components/RecentTransactions";
import RightSidebar from "@/components/RightSidebar";
import TotalBalanceBox from "@/components/TotalBalanceBox";
import { getAccount, getAccounts } from "@/lib/actions/bank.actions";
import { getLoggedInUser } from "@/lib/actions/user.actions";

const Home = async ({ searchParams}: SearchParamProps) => {

  const { id, page } = await searchParams;

  const currentPage = Number(page as string) || 1;

  const loggedInWrapper = await getLoggedInUser();
  console.log("LOGGED IN USER:", loggedInWrapper);

  const loggedIn = loggedInWrapper?.user;

  // If user not logged in / not found
  if (!loggedIn) {
    return (
      <section className="home">
        <div className="home-content">
          <HeaderBox
            type="greeting"
            title="Welcome"
            user="Guest"
            subtext="Please log in to view your accounts and transactions."
          />
        </div>
      </section>
    );
  }

  // 🔴 IMPORTANT: BANK_COLLECTION.userId currently stores user.$id (user doc id),
  // so we must query with loggedIn.$id, not loggedIn.userId.
  const accounts = await getAccounts({
    userId: loggedIn.$id,
  });

  if (!accounts) return null;

  const accountsData = accounts.data || [];

  // Only fetch a specific account if we actually have banks
  let accountResult: Awaited<ReturnType<typeof getAccount>> | null = null;

  if (accountsData.length > 0) {
    const appwriteItemId =
      (id as string) || accountsData[0].appwriteItemId;

    accountResult = await getAccount({ appwriteItemId });
  }

  console.log({
    accountsData,
    account: accountResult,
  });



  const selectedAccount = accountResult?.data || null;
  const accountError = accountResult?.error;
  const transactions = accountResult?.transactions || [];


  return (
    <section className="home">
      <div className="home-content">
        <header className="home-header">
          <HeaderBox
            type="greeting"
            title="Welcome"
            user={loggedIn.firstName || "User"}
            subtext="Access and manage your account and transactions efficiently"
          />

          <TotalBalanceBox
            accounts={accountsData}
            totalBanks={accounts.totalBanks}
            totalCurrentBalance={accounts.totalCurrentBalance}
          />
        </header>

        {accountsData.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            You have no linked bank accounts yet. Connect a bank to see your
            balances and transactions.
          </p>
        ) : accountError ? (
          <p className="mt-4 text-sm text-red-500">
            {accountError || "Failed to load selected account."}
          </p>
        ) : (
          <>
            <RecentTransactions
              accounts={accountsData}
              transactions={transactions}
              selectedAccountId={selectedAccount?.id} // plaid account_id
              page = {currentPage}
            />
            {/* <p className="mt-4 text-sm text-gray-700">
              Showing transactions for{" "}
              <span className="font-medium">{selectedAccount?.name}</span>
            </p> */}
          </>
        )}
      </div>

      <RightSidebar
        user={loggedIn}
        transactions={[]}
        banks={accountsData.slice(0, 2)}
      />
    </section>
  );
};

export default Home;
