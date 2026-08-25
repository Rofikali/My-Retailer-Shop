# Party Ledger Amendments

Customer and supplier masters store identity. Party ledgers record posted commercial events. This separation protects credit control, aging, cash collection, and statutory audit evidence.

## Field control matrix

| Field group | Rule | Reason |
| --- | --- | --- |
| Customer/supplier ID and name | Locked on posted ledger events | The party relationship must never be silently reassigned. Update static contact details in the relevant Master. |
| Date, voucher number, invoice/purchase number | Locked | These are source-document and period-control keys. |
| Debit, credit, running balance | Locked | Changing a posted amount would break receivable/payable and General Ledger reconciliation. |
| Entered by, approved by | Locked | Audit accountability must remain factual. |
| Particulars, payment mode, reference number, due date, remarks | Owner amendment allowed | These are operational metadata and can be corrected without changing accounting value. |

## Amendment workflow

1. Open the customer from **Customer Master** and select the customer ledger.
2. An owner selects **Amend** beside a posted row.
3. Correct only the operational metadata and provide a meaningful correction reason.
4. The application appends an amendment row; it never updates the original posted entry.
5. The ledger shows the latest approved presentation values and marks the row `amended`.
6. The original event, amendment reason, user, and timestamp remain retained for review.

## Financial corrections

Do not amend a financial error by changing a ledger amount. If quantity, price, discount, tax, party, date, or payment allocation is wrong:

1. Reverse the original posting through the owner-controlled reversal workflow.
2. Create a new corrected source transaction in Sales, Purchases, Cash Book, or the appropriate registry.
3. Reconcile the party ledger, General Ledger, Trial Balance, and related inventory movement.

This is the required approach for a production accounting system because it preserves a complete audit trail and avoids changing a previously reported period.
