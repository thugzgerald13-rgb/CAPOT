# Security Specification - CAPO Accounting

## 1. Data Invariants
- A `User` profile must always have an email and a matching UID from Firebase Auth.
- A `Client` (Business Profile) must be associated with exactly one `userId` which matches the creator's UID.
- Users can only read, update, or delete `Client` documents where `userId` equals their own `auth.uid`.
- Sensitive user fields like `uid` and `email` are immutable once set.
- Timestamps (`updatedAt`) must be set using server time.

## 2. The "Dirty Dozen" Payloads (Attacker Scenarios)
1. **Identity Spoofing**: Attempt to create a client with someone else's `userId`.
2. **Access Escalation**: Attempt to read a client document belonging to another user.
3. **Ghost Field Injection**: Adding `isAdmin: true` to a client document via the client SDK.
4. **ID Poisoning**: Using a 1MB string as a `clientId` to cause resource exhaustion.
5. **State Shortcutting**: Updating `registeredName` on an `Individual` taxpayer classification (business logic enforced in rules).
6. **Relational Breakage**: Changing the `userId` on an existing client to transfer ownership.
7. **PII Leak**: Querying for all user emails in the system.
8. **Denial of Wallet**: Sending deeply nested arrays in `sales` to inflate document size beyond limits.
9. **Timestamp Manipulation**: Sending a client-side date for `updatedAt`.
10. **Orphaned Writes**: Creating a client without a valid business name.
11. **Malicious Enum**: Setting `accountingType` to "Unknown" instead of "Calendar" or "Fiscal".
12. **Key Shadowing**: Attempting to hide data in fields not defined in the schema.

## 3. Test Runner (Mock)
- `test('attacker cannot read other users clients')` -> `PERMISSION_DENIED`
- `test('user can read their own clients')` -> `SUCCESS`
- `test('valid client creation')` -> `SUCCESS`
- `test('spoofed userId creation')` -> `PERMISSION_DENIED`
