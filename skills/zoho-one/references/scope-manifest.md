# Zoho One OAuth scope manifest

Last reconciled: 2026-08-30, US data center.

This is a grant-construction and audit reference, not proof that a token currently has these scopes. The refresh response's `scope` field is the authority for what was actually granted.

## Existing token families

| Alias | Refresh-token secret | Intended coverage |
|---|---|---|
| `zoho_one` | `ZOHO_ONE_REFRESH_TOKEN` | New cross-product grant; prefer when present |
| `workplace` | `ZOHO_ONE_WORKPLACE_REFRESH_TOKEN` | Directory, Mail, Calendar, Cliq, Connect, WorkDrive, Writer, Sheet, Show, Meeting |
| `growth` | `ZOHO_ONE_GROWTH_REFRESH_TOKEN` | CRM, Bigin, Bookings, Campaigns, SalesIQ, Social, Marketing Automation |
| `operations` | `ZOHO_ONE_OPERATIONS_REFRESH_TOKEN` | Desk, Creator, Backstage, Learn, Projects, Sprints, Sign, Voice |
| `people` | `ZOHO_ONE_PEOPLE_REFRESH_TOKEN` | People and Recruit |
| `finance` | `ZOHO_ONE_FINANCE_REFRESH_TOKEN` | Books, Expense, and Invoice |
| `data` | `ZOHO_ONE_DATA_REFRESH_TOKEN` | Analytics and DataPrep |
| `directory` | `ZOHO_ONE_DIRECTORY_REFRESH_TOKEN` | Zoho One Directory organization, user, and group APIs |
| `crm_v8` | `ZOHO_ONE_CRM_V8_REFRESH_TOKEN` | Accepted CRM v8 maximum grant for the Patriot Conceptions production org |
| `projects` | `ZOHO_ONE_PROJECTS_REFRESH_TOKEN` | Projects v3 and Sprints |
| `desk_creator` | `ZOHO_ONE_DESK_CREATOR_REFRESH_TOKEN` | Desk production org and Creator v2.1 |
| `content_voice` | `ZOHO_ONE_CONTENT_VOICE_REFRESH_TOKEN` | Backstage, accepted Learn scopes, Sign, and Voice |
| `mail_calendar` | `ZOHO_ONE_MAIL_CALENDAR_REFRESH_TOKEN` | Mail and Calendar |
| `crm` | `ZOHO_CRM_ALL_REFRESH_TOKEN` | CRM v8 and CRM dependencies |
| `books` | `ZOHO_BOOKS_REFRESH_TOKEN` | Books v3 |
| `workdrive` | `ZOHO_WORKDRIVE_REFRESH_TOKEN` | WorkDrive |
| `vault` | `ZOHO_VAULT_REFRESH_TOKEN` | Vault |
| `portal` | `ZOHO_REFRESH_TOKEN` | Legacy CRM, Writer, Mail, Calendar, Connect, and Projects grant |

## Broad group scopes

Use documented full-access groups where they exist:

```text
ZohoAnalytics.fullaccess.all
ZohoExpense.fullaccess.ALL
ZohoInvoice.fullaccess.all

ZohoBigin.modules.ALL
ZohoBigin.settings.ALL
ZohoBigin.users.ALL
ZohoBigin.org.ALL
ZohoBigin.bulk.ALL
ZohoBigin.notifications.ALL

ZohoCRM.modules.ALL
ZohoCRM.settings.ALL
ZohoCRM.users.ALL
ZohoCRM.org.ALL
ZohoCRM.bulk.ALL
ZohoCRM.notifications.ALL

ZOHOPEOPLE.employee.ALL
ZOHOPEOPLE.forms.ALL
ZOHOPEOPLE.dashboard.ALL
ZOHOPEOPLE.automation.ALL
ZOHOPEOPLE.timetracker.ALL
ZOHOPEOPLE.attendance.ALL
ZOHOPEOPLE.leave.ALL

ZohoRecruit.modules.ALL
ZohoRecruit.settings.ALL
ZohoRecruit.users.ALL
ZohoRecruit.org.ALL
ZohoRecruit.bulk.ALL

ZohoVault.secrets.ALL
ZohoVault.user.ALL
```

Books v3 is currently represented by explicit `.ALL` scopes for accountants, banking, bills, contacts, credit notes, customer payments, debit notes, estimates, expenses, invoices, projects, purchase orders, sales orders, settings, and vendor payments.

## CRM v8 special addenda

The runtime `__apis` catalog exposed the following families outside the ordinary group grants:

- `ZohoCRM.change_owner.<module>.READ` and `.CREATE` for accounts, bundles, calls, campaigns, cases, contacts, custom, deals, events, invoices, leads, pricebooks, products, purchaseorders, quotes, salesorders, solutions, tasks, and vendors.
- `ZohoCRM.digest.CREATE`
- `ZohoCRM.emails.compose.READ`, `.UPDATE`, `.DELETE`
- `ZohoCRM.mass_convert.Quotes.READ`, `.CREATE`
- `ZohoCRM.mass_convert.SalesOrders.READ`, `.CREATE`
- `ZohoCRM.zia.enrichment.READ`, `.CREATE`, `.UPDATE`, `.DELETE`
- `crmapi.READ` appeared in the runtime catalog but must be validated in the API Console before grant creation.

Retain the existing CRM files, share, send-mail, templates, functions, GraphQL, mass-update, mass-delete, signals, search, and Zoho Files scopes unless the current v8 catalog proves they are obsolete.

## Cross-product dependencies

Writer and Office operations may require these scopes on the same token:

```text
ZohoWriter.documentEditor.ALL
ZohoWriter.merge.ALL
ZohoPC.files.ALL
WorkDrive.files.ALL
WorkDrive.organization.ALL
WorkDrive.workspace.ALL
ZohoSign.documents.ALL
```

Show requires all four `ZohoShow.showdocslist` operations plus `ZohoSearch.securesearch.READ`, `WorkDrive.team.READ`, and `WorkDrive.organization.READ` for search and workspace reads.

Calendar maximum functional coverage includes:

```text
ZohoCalendar.calendar.ALL
ZohoCalendar.event.ALL
ZohoCalendar.search.ALL
ZohoCalendar.bookings.ALL
```

## Enumerated products

These products do not provide one stable root wildcard. Build the grant from the current product scope page or API catalog immediately before authorization:

- Zoho Directory: all operations for `ZohoDirectory.Orgs`, `Users`, and `Groups`.
- Backstage v3: portal, event, agenda, attendee, event ticket, exhibitor, order, speaker, sponsor, and webhook operations.
- Connect: all supported operations for the 11 `ZohoPulse` scope families.
- Creator v2.1: form create, report CRUD, metadata reads, and dashboard read.
- Desk: tickets, contacts, tasks, basic, settings, search, events, and articles.
- Learn: all current course, manual, article, member, attachment, quiz, question-bank, portal, and related resource operations.
- Mail: user accounts, folders, links, messages, notes, tags, tasks, and organization administration families. Include partner organization only for an actual Mail partner use case.
- Projects v3: use the v3 catalog, not the retired v2 list. The current catalog spans 80 method scopes across 22 families.
- SalesIQ: use the current scope-name/operations table.
- Sign: document, template, and account operations.
- Sprints: use current endpoint scopes; there is no authoritative consolidated root wildcard.
- Voice: preserve the exact service-name capitalization documented by each endpoint.
- Cliq v3: use the current OAuth page; it exposes many endpoint scopes and no universal root wildcard.

## Product-managed or narrow-only surfaces

Do not invent broad Self Client scopes for products whose current official documentation does not publish them:

- Forms and TeamInbox expose managed OAuth integrations but not a complete public reusable scope catalog.
- Notebook's supported AI surface is its product-managed MCP authorization.
- Survey publicly documents the narrow `ZohoSurvey.invitation.CREATE` scope.
- Flow, LandingPage, MDM, and Sites do not currently publish a complete public product-data OAuth manifest.
- AWS, Buzz, and PC-portal are custom Directory applications, not Zoho product scope families.

## Rotation gate

1. Inventory current connected-app approval dates and the exact OAuth client.
2. Do not revoke a different client's old connected-app grant merely to free a Self Client refresh-token slot.
3. Generate one bounded grant at a time.
4. Exchange the authorization code before it expires and store the refresh token only in Secret Manager.
5. Refresh once and compare the returned scope set with the requested manifest.
6. Run one privacy-safe read canary per product family.
7. Revoke a superseded token only after the replacement passes readback.

Observed 2026-08-31: the Directory, Finance, People, and Data bundles were accepted and stored with exact scope readback. Recruit was rejected because the authorizing user is not a member of any Recruit service organization. The oversized Workplace bundle was rejected by multi-organization preflight and must remain decomposed.

CRM v8 accepted 105 scopes. The OAuth Console rejected `ZohoCRM.change_owner.purchaseorders.READ` even though the live v8 `__apis` catalog listed it; the accepted manifest therefore omits only that string.

Projects plus Sprints accepted 82 scopes. Desk plus Creator accepted 23. Backstage, the accepted Learn families, Sign, and Voice accepted 73 after removing ten rejected Learn `.ALL` variants. Mail plus Calendar accepted 18.

Cliq and Connect were not grantable in this Self Client flow; a clean `zohopulse.networklist.READ` control also failed. The mixed Office/WorkDrive/Meeting grant failed after Meeting portal selection and created no token. Existing WorkDrive and portal grants remain the current authority for those surfaces.

Final accepted readback for this iteration: nine new token families, 340 granted scope entries and 339 unique scope strings. No pre-existing refresh token or connected-app grant was revoked.
