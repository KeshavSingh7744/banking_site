import Link from 'next/link'
import React from 'react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BankTabItem } from './BankTabItem'
import BankInfo from './BankInfo'
import TransactionsTable from './TransactionsTable'

const RecentTransactions = ({ accounts, transactions = [], appwriteItemId, page = 1 }: RecentTransactionsProps) => {
    return (
        <section className='recent-transactions'>

            <header className='flex items-center justify-between'>

                <h2 className='recent-transactions-label'>
                    Recent Transactions
                </h2>

                <Link href={`/transaction-history/?id=${appwriteItemId}`} className='view-all-btn'>View all</Link>

            </header>
            <Tabs defaultValue={appwriteItemId} className="w-full">
                <TabsList className="recent-transactions-tablist flex justify-center">
                    {accounts.map((account: Account) => (
                        <TabsTrigger
                            key={account.id}
                            value={account.appwriteItemId}
                            className="
                                 group
                                 bg-transparent
                                 px-0 py-0
                                 text-sm font-medium
                                 text-gray-500
                                 border-none
                                 data-[state=active]:text-blue-600
                               "
                        >
                            <span
                                className="
                                  pb-1
                                  border-b-2 border-gray-200
                                  group-data-[state=active]:border-blue-600
                                "
                            >
                                {account.name}
                            </span>
                        </TabsTrigger>
                    ))}
                </TabsList>



                {accounts.map((account: Account) => (
                    <TabsContent value={account.appwriteItemId} key={account.id} className='space-y-4'>
                        <BankInfo account={account} appwriteItemId={appwriteItemId} type='full' />
                        <TransactionsTable transactions={transactions} />
                    </TabsContent>
                ))}

            </Tabs>
        </section>
    )
}

export default RecentTransactions
