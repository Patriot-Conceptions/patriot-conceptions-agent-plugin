#!/usr/bin/env node

const crud = ["CREATE", "READ", "UPDATE", "DELETE"];
const expand = (service, map) =>
  Object.entries(map).flatMap(([family, operations]) =>
    operations.map((operation) => `${service}.${family}.${operation}`),
  );

const workplace = [
  ...expand("ZohoDirectory", { Orgs: crud, Users: crud, Groups: crud }),
  ...expand("ZohoMail", {
    accounts: ["ALL"], folders: ["ALL"], links: ["ALL"], messages: ["ALL"],
    notes: ["ALL"], tags: ["ALL"], tasks: ["ALL"],
    "organization.accounts": ["ALL"], "organization.audit": ["ALL"],
    "organization.domains": ["ALL"], "organization.groups": ["ALL"],
    "organization.policy": ["ALL"], "organization.spam": ["ALL"],
    "organization.subscriptions": ["ALL"],
  }),
  "ZohoCalendar.calendar.ALL", "ZohoCalendar.event.ALL", "ZohoCalendar.search.ALL",
  "ZohoCalendar.bookings.ALL",
  ...expand("ZohoCliq", {
    Applications: ["UPDATE"], Attachments: ["READ"], BotMessages: ["CREATE"], Bots: crud,
    CalendarEvents: ["ALL"], Channels: crud, Chats: crud, Messages: crud,
    DatastoreRecords: ["ALL"], Datastores: ["ALL"], Departments: crud, Designations: crud,
    Extensions: ["CREATE", "READ", "UPDATE"], Functions: crud,
    MediaSession: ["READ"], messageactions: crud, Organisation: crud, Profile: crud,
    Reminders: ["ALL"], StorageData: ["ALL"], Teams: crud,
    UserFields: ["CREATE"], Userfields: ["UPDATE", "DELETE"],
    Users: ["CREATE", "READ", "UPDATE"], Webhooks: ["CREATE"],
  }),
  ...expand("ZohoPulse", {
    connectNotifications: crud, blogs: ["READ", "CREATE", "UPDATE"],
    networkAdmin: ["CREATE", "DELETE", "UPDATE"], attachments: ["CREATE", "DELETE", "READ"],
    feedList: crud, grouplist: crud, networklist: ["READ", "CREATE"],
    pagelist: ["DELETE", "CREATE", "READ"], events: crud, userDetail: crud, tasks: crud,
  }),
  "WorkDrive.team.ALL", "WorkDrive.teamfolders.ALL", "WorkDrive.teamfolders.sharing.ALL",
  "WorkDrive.teamfolders.admin.READ", "WorkDrive.groups.ALL", "WorkDrive.files.ALL",
  "WorkDrive.links.ALL", "WorkDrive.organization.ALL", "WorkDrive.workspace.ALL",
  "ZohoWriter.documentEditor.ALL", "ZohoWriter.merge.ALL", "ZohoPC.files.ALL",
  "ZohoSign.documents.ALL", "ZohoSheet.dataAPI.ALL",
  ...expand("ZohoShow", { showdocslist: crud }),
  "ZohoSearch.securesearch.READ", "ZohoMeeting.meeting.ALL", "ZohoMeeting.webinar.ALL",
];

const crmShareModules = [
  "leads", "accounts", "contacts", "deals", "campaigns", "tasks", "cases", "events",
  "calls", "solutions", "products", "vendors", "pricebooks", "quotes", "salesorders",
  "purchaseorders", "invoices", "custom",
];
const crmChangeOwnerModules = [
  "accounts", "bundles", "calls", "campaigns", "cases", "contacts", "custom", "deals",
  "events", "invoices", "leads", "pricebooks", "products", "purchaseorders", "quotes",
  "salesorders", "solutions", "tasks", "vendors",
];
const growth = [
  "Aaaserver.profile.READ", "ZohoCRM.modules.ALL", "ZohoCRM.modules.attachments.ALL",
  "ZohoCRM.modules.emails.ALL", "ZohoCRM.settings.ALL", "ZohoCRM.users.ALL",
  "ZohoCRM.org.ALL", "ZohoCRM.coql.READ", "ZohoCRM.bulk.ALL", "ZohoCRM.notifications.ALL",
  "ZohoCRM.files.CREATE", "ZohoCRM.files.READ", "ZohoCRM.send_mail.all.CREATE",
  ...crmShareModules.map((module) => `ZohoCRM.share.${module}.ALL`),
  ...expand("ZohoCRM", {
    "templates.email": crud, "templates.inventory": crud,
    "templates.email.send_test_mail": ["CREATE"], "functions.execute": ["READ", "CREATE"],
    graphql: ["READ"], features: ["READ"], mass_update: ["READ", "UPDATE"],
    mass_delete: ["READ", "DELETE"], "mass_convert.leads": ["CREATE", "READ"],
    composite_requests: ["CUSTOM"], apis: ["READ"], signals: ["ALL"],
    "settings.mailmerge": ["CREATE"], digest: ["CREATE"],
    "emails.compose": ["READ", "UPDATE", "DELETE"],
    "mass_convert.Quotes": ["READ", "CREATE"],
    "mass_convert.SalesOrders": ["READ", "CREATE"],
    "zia.enrichment": crud,
  }),
  ...crmChangeOwnerModules.flatMap((module) => [
    `ZohoCRM.change_owner.${module}.READ`, `ZohoCRM.change_owner.${module}.CREATE`,
  ]).filter((scope) => scope !== "ZohoCRM.change_owner.purchaseorders.READ"),
  "ZohoSearch.securesearch.READ", "ZohoFiles.files.ALL",
  "ZohoBigin.modules.ALL", "ZohoBigin.settings.ALL", "ZohoBigin.users.ALL",
  "ZohoBigin.org.ALL", "ZohoBigin.bulk.ALL", "ZohoBigin.notifications.ALL",
  "zohobookings.data.CREATE", "ZohoCampaigns.campaign.ALL", "ZohoCampaigns.contact.ALL",
  ...expand("SalesIQ", {
    operators: crud, portals: ["READ", "CREATE", "UPDATE"], departments: crud,
    leadscorerules: crud, leadscoreconfigs: ["READ", "UPDATE"], criteriafields: ["READ"],
    visitorroutingrules: crud, chatroutingrules: crud, cannedresponses: crud, blockedips: crud,
    chatmonitors: crud, counts: ["READ"], visitors: ["READ"], feedbacks: ["READ"],
    conversations: ["READ", "CREATE"], trackingpresets: crud,
    userpreferences: ["READ", "UPDATE"], visitorhistoryviews: crud, triggerrules: crud,
    webhooks: crud, callbacks: ["UPDATE"], Apps: crud, articles: crud,
    encryptions: ["CREATE"], media: ["READ"],
  }),
  "ZohoSocial.Organization.READ", "ZohoSocial.Integration.READ", "ZohoSocial.Publish.ALL",
  "ZohoSocial.Media.ALL", "ZohoMarketingAutomation.campaign.ALL",
  "ZohoMarketingAutomation.lead.ALL", "ZohoMarketingAutomation.journey.READ",
  "ZohoMarketingAutomation.journey.CREATE", "ZohoMarketingAutomation.wa.READ",
];

const projectsMap = {
  bugs: crud, bulk: ["READ"], clients: crud, custom_fields: crud,
  custom_functions: ["custom"], documents: crud, events: crud, extensions: crud, forums: crud,
  integrations: ["READ"], leave: crud, milestones: crud, portals: crud, projectgroups: crud,
  projects: ["ALL"], status: ["CREATE", "READ"], tags: crud, tasklists: crud,
  tasks: ["ALL"], teams: crud, timesheets: ["ALL"], users: crud,
};
const backstageMap = {
  portal: ["READ"], event: crud, agenda: crud, attendee: ["READ", "UPDATE"],
  eventticket: crud, exhibitor: crud, order: ["CREATE", "READ", "UPDATE"], speaker: crud,
  sponsor: crud, webhook: crud,
};
const learnFamilies = [
  "customportal", "manual", "space", "article", "comment", "template", "questionbank",
  "tag", "notification", "course", "quiz",
];
const operations = [
  "Desk.tickets.ALL", "Desk.contacts.READ", "Desk.contacts.WRITE", "Desk.contacts.UPDATE",
  "Desk.contacts.CREATE", "Desk.tasks.ALL", "Desk.basic.READ", "Desk.basic.CREATE",
  "Desk.settings.ALL", "Desk.search.READ", "Desk.events.ALL", "Desk.articles.READ",
  "Desk.articles.CREATE", "Desk.articles.UPDATE", "Desk.articles.DELETE",
  "ZohoCreator.form.CREATE", "ZohoCreator.report.CREATE", "ZohoCreator.report.READ",
  "ZohoCreator.report.UPDATE", "ZohoCreator.report.DELETE", "ZohoCreator.meta.form.READ",
  "ZohoCreator.meta.application.READ", "ZohoCreator.dashboard.READ",
  ...expand("ZohoBackstage", backstageMap),
  ...learnFamilies.map((family) => `ZohoLearn.${family}.ALL`),
  ...expand("ZohoProjects", projectsMap),
  "ZohoSprints.projects.ALL", "ZohoSprints.sprints.ALL", "ZohoSprints.items.ALL",
  "ZohoSprints.teams.ALL", "ZohoSprints.timesheets.ALL", "ZohoSprints.meetings.ALL",
  "ZohoSprints.release.ALL", "ZohoSprints.epic.ALL", "ZohoSprints.projectgroups.ALL",
  "ZohoSprints.projectitemstatus.ALL", "ZohoSprints.projectsettings.ALL",
  "ZohoSprints.projectusers.READ", "ZohoSprints.teamusers.ALL", "ZohoSprints.webhook.ALL",
  "ZohoSign.documents.ALL", "ZohoSign.templates.ALL", "ZohoSign.account.ALL",
  ...expand("ZohoVoice", {
    agents: crud, call: ["CREATE", "DELETE", "READ"], powerdialer: crud,
    sms: ["CREATE", "READ"], telephony: crud,
  }),
  ...expand("zohovoice", { contacts: crud, queues: crud }),
];

const people = [
  "ZOHOPEOPLE.employee.ALL", "ZOHOPEOPLE.forms.ALL", "ZOHOPEOPLE.dashboard.ALL",
  "ZOHOPEOPLE.automation.ALL", "ZOHOPEOPLE.timetracker.ALL", "ZOHOPEOPLE.attendance.ALL",
  "ZOHOPEOPLE.leave.ALL", "ZohoRecruit.modules.ALL", "ZohoRecruit.settings.ALL",
  "ZohoRecruit.users.ALL", "ZohoRecruit.org.ALL", "ZohoRecruit.bulk.ALL",
  ...expand("ZohoRecruit", { notifications: crud }), "ZohoRecruit.search.READ",
];

const booksFamilies = [
  "accountants", "banking", "bills", "contacts", "creditnotes", "customerpayments",
  "debitnotes", "estimates", "expenses", "invoices", "projects", "purchaseorders",
  "salesorders", "settings", "vendorpayments",
];
const finance = [
  ...booksFamilies.map((family) => `ZohoBooks.${family}.ALL`),
  "ZohoExpense.fullaccess.ALL", "ZohoInvoice.fullaccess.all",
];

const data = [
  "ZohoAnalytics.fullaccess.all", "zohodataprep.dataprepapi.ALL", "ZohoFiles.files.ALL",
];

const bundles = { workplace, growth, operations, people, finance, data };
const requested = process.argv[2];
if (!requested || !bundles[requested]) {
  console.error(`Usage: scope-bundles.mjs <${Object.keys(bundles).join("|")}> [--json]`);
  process.exit(2);
}
const scopes = [...new Set(bundles[requested])];
if (process.argv.includes("--json")) {
  process.stdout.write(JSON.stringify({ bundle: requested, scope_count: scopes.length, scopes }, null, 2) + "\n");
} else {
  process.stdout.write(scopes.join(","));
}
