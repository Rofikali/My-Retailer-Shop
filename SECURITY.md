# Security Policy

## Scope

RetailShop ERP handles business records such as customers, suppliers, inventory, sales, purchases, expenses, and financial reports. Security-sensitive areas include authentication, session handling, authorization, database access, transaction integrity, audit data, and sensitive configuration.

## Reporting a vulnerability

Please do not disclose an exploitable security issue in a public issue.

Use GitHub's private vulnerability reporting/security advisory mechanism for this repository when available. Include:

- affected route, service, or component
- reproduction steps or a minimal proof of concept
- expected and observed behavior
- affected commit or version
- relevant logs with secrets and personal data removed

Do not include passwords, session cookies, API keys, database credentials, or private customer data.

## Security expectations

Changes affecting authentication, authorization, database transactions, ledger posting, migrations, or data validation should include appropriate automated tests and should preserve transaction boundaries and auditability.

Before production use with real customer or financial data, review the production security documentation and replace development-only authentication/configuration with production-grade controls.
