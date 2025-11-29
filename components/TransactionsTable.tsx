import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatAmount,
  formatDateTime,
  getTransactionStatus,
  removeSpecialCharacters,
} from "@/lib/utils";

import { cn } from "@/lib/utils";
import { transactionCategoryStyles } from "@/constants";

// 🔹 Badge can be used for both status + category
type CategoryBadgeProps = {
  category: string;
  kind?: "status" | "category"; // status → use key directly, category → infer group
};

const CategoryBadge = ({ category, kind = "category" }: CategoryBadgeProps) => {
  let styleKey = category;

  if (kind === "category") {
    const lower = category.toLowerCase();

    if (lower.includes("income") || lower.includes("loan")) {
      styleKey = "Income";
    } else if (lower.includes("transfer")) {
      // handles "Transfer out", "Transfer"
      styleKey = "Transfer out";
    } else if (lower.includes("food") || lower.includes("drink")) {
      styleKey = "Food and drink";
    } else if (lower.includes("bank fee")) {
      styleKey = "Bank Fees";
    } else if (lower.includes("payment")) {
      styleKey = "Payment";
    } else if (lower.includes("travel")) {
      styleKey = "Travel";
    } else if (lower.includes("transport")) {
      styleKey = "Transportation";
    } else if (lower.includes("entertain")) {
      styleKey = "Entertainment";
    }
  }

  const {
    borderColor,
    backgroundColor,
    textColor,
    chipBackgroundColor,
  } =
    transactionCategoryStyles[
      styleKey as keyof typeof transactionCategoryStyles
    ] || transactionCategoryStyles.default;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
        "max-w-[100px]",
        borderColor,
        chipBackgroundColor
      )}
    >
      <span
        className={cn("h-2 w-2 rounded-full flex-shrink-0", backgroundColor)}
      />
      <p
        className={cn(
          "text-[11px] font-semibold leading-tight truncate",
          textColor
        )}
      >
        {category}
      </p>
    </div>
  );
};

const TransactionsTable = ({ transactions }: TransactionTableProps) => {
  return (
    <div className="w-full overflow-x-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <Table className="w-full">
        <TableHeader className="bg-[#f9fafb]">
          <TableRow>
            <TableHead className="px-3 py-2 text-[11px] font-semibold uppercase text-slate-500">
              Transaction
            </TableHead>
            <TableHead className="px-3 py-2 text-[11px] font-semibold uppercase text-slate-500 text-right">
              Amount
            </TableHead>
            <TableHead className="px-3 py-2 text-[11px] font-semibold uppercase text-slate-500">
              Status
            </TableHead>
            <TableHead className="px-3 py-2 text-[11px] font-semibold uppercase text-slate-500">
              Date
            </TableHead>
            <TableHead className="px-3 py-2 max-md:hidden text-[11px] font-semibold uppercase text-slate-500">
              Channel
            </TableHead>
            <TableHead className="px-3 py-2 max-md:hidden text-[11px] font-semibold uppercase text-slate-500">
              Category
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {transactions.map((t: Transaction) => {
            const status = getTransactionStatus(new Date(t.date));
            const amount = formatAmount(t.amount);

            const isDebit = t.type === "debit";
            const isCredit = t.type === "credit";

            // raw Plaid category (e.g. "Transportation", "Transfer out")
            const rawCategoryFromPlaid = t.category || "Uncategorized";

            // nice label for UI
            const prettyCategory = rawCategoryFromPlaid;

            return (
              <TableRow
                key={t.id}
                className={cn(
                  isDebit || amount[0] === "-"
                    ? "bg-[#FFFBFA]"
                    : "bg-[#F6FEF9]",
                  "transition-colors hover:bg-[#EEF2FF]/60",
                  "!border-b-default"
                )}
              >
                {/* Transaction */}
                <TableCell className="pl-3 pr-2 py-2">
                  <div className="flex items-center gap-2">
                    <h1 className="text-[13px] font-semibold text-[#344054] truncate">
                      {removeSpecialCharacters(t.name)}
                    </h1>
                  </div>
                </TableCell>

                {/* Amount */}
                <TableCell
                  className={cn(
                    "pl-2 pr-3 py-2 text-[13px] font-semibold tabular-nums text-right whitespace-nowrap",
                    isDebit || amount[0] === "-"
                      ? "text-[#f04438]"
                      : "text-[#039855]"
                  )}
                >
                  {isDebit ? `-${amount}` : isCredit ? amount : amount}
                </TableCell>

                {/* Status – uses map directly */}
                <TableCell className="pr-2 py-2">
                  <CategoryBadge category={status} kind="status" />
                </TableCell>

                {/* Date */}
                <TableCell className="pr-2 py-2">
                  <p className="text-[12px] text-gray-600 truncate">
                    {formatDateTime(new Date(t.date)).dateTime}
                  </p>
                </TableCell>

                {/* Channel */}
                <TableCell className="max-md:hidden pr-2 py-2 capitalize">
                  <p className="text-[12px] text-slate-700 truncate">
                    {t.paymentChannel}
                  </p>
                </TableCell>

                {/* Category – inferred to green / blue / red etc. */}
                <TableCell className="max-md:hidden pr-3 py-2">
                  <CategoryBadge
                    category={prettyCategory}
                    kind="category"
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default TransactionsTable;
