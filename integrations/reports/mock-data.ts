import type { ReportItem } from "./types";

export const MOCK_REPORTS: ReportItem[] = [
  {
    archived: false,
    createdAt: "2025-01-15T10:00:00Z",
    createdBy: "u1",
    description:
      "Weekly summary of all active tasks across teams, including overdue items and upcoming deadlines.",
    frequency: "weekly",
    id: "1",
    name: "Weekly Task Summary",
    recipients: [
      { id: "u1", image: null, name: "Alice Sharma" },
      { id: "u2", image: null, name: "Ravi Kumar" },
    ],
    updatedAt: "2025-03-01T08:30:00Z",
  },
  {
    archived: false,
    createdAt: "2025-02-01T09:00:00Z",
    createdBy: "u2",
    description:
      "Daily count of new prospects added, their current status, and conversion funnel metrics.",
    frequency: "daily",
    id: "2",
    name: "Daily Prospects Pipeline",
    recipients: [
      { id: "u3", image: null, name: "Priya Nair" },
      { id: "u1", image: null, name: "Alice Sharma" },
      { id: "u4", image: null, name: "Arjun Mehta" },
    ],
    updatedAt: "2025-03-10T14:00:00Z",
  },
  {
    archived: false,
    createdAt: "2024-12-10T11:00:00Z",
    createdBy: "u1",
    description:
      "Monthly revenue targets vs actuals, broken down by team and client.",
    frequency: "monthly",
    id: "3",
    name: "Monthly Revenue Report",
    recipients: [
      { id: "u5", image: null, name: "Sneha Iyer" },
      { id: "u1", image: null, name: "Alice Sharma" },
    ],
    updatedAt: "2025-02-28T17:00:00Z",
  },
  {
    archived: true,
    createdAt: "2024-09-05T10:00:00Z",
    createdBy: "u3",
    description:
      "Quarterly compliance checklist — archived as the process moved to an external tool.",
    frequency: "quarterly",
    id: "4",
    name: "Quarterly Compliance Audit",
    recipients: [{ id: "u3", image: null, name: "Priya Nair" }],
    updatedAt: "2025-01-10T09:00:00Z",
  },
  {
    archived: false,
    createdAt: "2025-03-01T10:00:00Z",
    createdBy: "u4",
    description:
      "Weekly snapshot of team productivity — tasks completed, average turnaround time, and blockers.",
    frequency: "weekly",
    id: "5",
    name: "Team Productivity Snapshot",
    recipients: [
      { id: "u4", image: null, name: "Arjun Mehta" },
      { id: "u2", image: null, name: "Ravi Kumar" },
      { id: "u5", image: null, name: "Sneha Iyer" },
    ],
    updatedAt: "2025-03-12T11:00:00Z",
  },
];
