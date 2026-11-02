/** Apps a subcontractor's team usually needs, grouped the way an office thinks about them. */
export const APP_GROUPS: { group: string; apps: { key: string; name: string }[] }[] = [
  { group: "Email and calendar", apps: [{ key: "gmail", name: "Gmail" }, { key: "outlook", name: "Outlook" }, { key: "gcal", name: "Google Calendar" }] },
  { group: "Bid platforms", apps: [{ key: "buildingconnected", name: "BuildingConnected" }, { key: "procore", name: "Procore" }, { key: "constructconnect", name: "ConstructConnect" }, { key: "planhub", name: "PlanHub" }] },
  { group: "Files and plans", apps: [{ key: "gdrive", name: "Google Drive" }, { key: "onedrive", name: "OneDrive and SharePoint" }, { key: "dropbox", name: "Dropbox" }, { key: "bluebeam", name: "Bluebeam" }] },
  { group: "CRM and projects", apps: [{ key: "monday", name: "Monday" }, { key: "hubspot", name: "HubSpot" }, { key: "salesforce", name: "Salesforce" }] },
  { group: "Accounting", apps: [{ key: "quickbooks", name: "QuickBooks" }, { key: "sage", name: "Sage" }] },
  { group: "Team chat", apps: [{ key: "slack", name: "Slack" }, { key: "teams", name: "Microsoft Teams" }] },
];
