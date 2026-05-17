export const kpiData = {
  avgCompletionDays: 3.2,
  avgCompletionDaysDelta: -0.5,
  completionRate: 68,
  completionRateDelta: 4.2,
  overdueTasks: 23,
  overdueTasksDelta: 8.7,
  totalTasks: 1247,
  totalTasksDelta: 12.5,
};

export const trendData = [
  { completed: 45, created: 65, month: "Jan" },
  { completed: 52, created: 78, month: "Feb" },
  { completed: 71, created: 90, month: "Mar" },
  { completed: 68, created: 81, month: "Apr" },
  { completed: 80, created: 95, month: "May" },
  { completed: 92, created: 110, month: "Jun" },
  { completed: 88, created: 102, month: "Jul" },
  { completed: 95, created: 115, month: "Aug" },
  { completed: 90, created: 98, month: "Sep" },
  { completed: 105, created: 120, month: "Oct" },
  { completed: 98, created: 108, month: "Nov" },
  { completed: 110, created: 125, month: "Dec" },
];

export const statusData = [
  { count: 312, fill: "var(--color-todo)", status: "To Do" },
  { count: 245, fill: "var(--color-inProgress)", status: "In Progress" },
  { count: 189, fill: "var(--color-inReview)", status: "In Review" },
  { count: 421, fill: "var(--color-done)", status: "Done" },
  { count: 80, fill: "var(--color-archived)", status: "Archived" },
];

export const priorityData = [
  { count: 42, priority: "Urgent" },
  { count: 187, priority: "High" },
  { count: 395, priority: "Medium" },
  { count: 623, priority: "Low" },
];

export const teamData = [
  { completed: 190, fill: "var(--color-alex)", name: "Alex M.", tasks: 245 },
  { completed: 165, fill: "var(--color-sarah)", name: "Sarah K.", tasks: 198 },
  { completed: 140, fill: "var(--color-james)", name: "James L.", tasks: 176 },
  { completed: 175, fill: "var(--color-priya)", name: "Priya R.", tasks: 210 },
  { completed: 120, fill: "var(--color-omar)", name: "Omar S.", tasks: 156 },
  { completed: 105, fill: "var(--color-lin)", name: "Lin W.", tasks: 132 },
];

export const activityData = [
  { assigned: 72, completed: 45, month: "Jan", overdue: 8 },
  { assigned: 85, completed: 52, month: "Feb", overdue: 6 },
  { assigned: 98, completed: 71, month: "Mar", overdue: 12 },
  { assigned: 88, completed: 68, month: "Apr", overdue: 9 },
  { assigned: 105, completed: 80, month: "May", overdue: 7 },
  { assigned: 118, completed: 92, month: "Jun", overdue: 11 },
  { assigned: 110, completed: 88, month: "Jul", overdue: 10 },
  { assigned: 122, completed: 95, month: "Aug", overdue: 14 },
  { assigned: 108, completed: 90, month: "Sep", overdue: 8 },
  { assigned: 130, completed: 105, month: "Oct", overdue: 9 },
  { assigned: 115, completed: 98, month: "Nov", overdue: 7 },
  { assigned: 135, completed: 110, month: "Dec", overdue: 12 },
];

export const timelineData = [
  {
    date: "2025-01-15",
    event: "Sprint 1 Start",
    fill: "var(--color-milestone)",
  },
  {
    date: "2025-02-10",
    event: "Design Review",
    fill: "var(--color-milestone)",
  },
  { date: "2025-03-05", event: "MVP Release", fill: "var(--color-milestone)" },
  { date: "2025-04-20", event: "User Testing", fill: "var(--color-milestone)" },
  { date: "2025-05-15", event: "Beta Launch", fill: "var(--color-milestone)" },
  { date: "2025-06-30", event: "V1 Release", fill: "var(--color-milestone)" },
  { date: "2025-08-10", event: "V1.1 Patch", fill: "var(--color-milestone)" },
  { date: "2025-09-25", event: "V2 Planning", fill: "var(--color-milestone)" },
];

export const heatmapData = [
  { afternoon: 90, day: "Mon", evening: 25, midday: 75, morning: 45 },
  { afternoon: 80, day: "Tue", evening: 30, midday: 85, morning: 60 },
  { afternoon: 70, day: "Wed", evening: 15, midday: 95, morning: 55 },
  { afternoon: 85, day: "Thu", evening: 35, midday: 65, morning: 50 },
  { afternoon: 60, day: "Fri", evening: 10, midday: 80, morning: 40 },
  { afternoon: 15, day: "Sat", evening: 5, midday: 20, morning: 10 },
  { afternoon: 6, day: "Sun", evening: 3, midday: 8, morning: 5 },
];

export const dotMatrixData = [
  { category: "To Do", count: 312, fill: "var(--color-todo)" },
  { category: "In Progress", count: 245, fill: "var(--color-inProgress)" },
  { category: "In Review", count: 189, fill: "var(--color-inReview)" },
  { category: "Done", count: 421, fill: "var(--color-done)" },
  { category: "Archived", count: 80, fill: "var(--color-archived)" },
];

export const funnelData = [
  { fill: "var(--color-leads)", name: "Leads", value: 960 },
  { fill: "var(--color-qualified)", name: "Qualified", value: 680 },
  { fill: "var(--color-proposal)", name: "Proposal", value: 420 },
  { fill: "var(--color-negotiation)", name: "Negotiation", value: 240 },
  { fill: "var(--color-closed)", name: "Closed", value: 148 },
];

export const alluvialData = {
  links: [
    { source: 0, target: 4, value: 120 },
    { source: 0, target: 5, value: 80 },
    { source: 0, target: 6, value: 50 },
    { source: 0, target: 7, value: 30 },
    { source: 1, target: 4, value: 60 },
    { source: 1, target: 5, value: 90 },
    { source: 1, target: 6, value: 40 },
    { source: 1, target: 7, value: 60 },
    { source: 2, target: 4, value: 80 },
    { source: 2, target: 5, value: 55 },
    { source: 2, target: 6, value: 70 },
    { source: 2, target: 7, value: 145 },
    { source: 3, target: 4, value: 52 },
    { source: 3, target: 5, value: 20 },
    { source: 3, target: 6, value: 29 },
    { source: 3, target: 7, value: 186 },
  ],
  nodes: [
    { name: "Referral" },
    { name: "Direct" },
    { name: "Inbound" },
    { name: "Outbound" },
    { name: "To Do" },
    { name: "In Progress" },
    { name: "In Review" },
    { name: "Done" },
  ],
};
