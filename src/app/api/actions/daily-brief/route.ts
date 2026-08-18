import { NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/dataService';
import { formatDate } from '@/lib/text';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const data = await getDashboardData();
    const date = formatDate(new Date(), { day: 'numeric', month: 'long', year: 'numeric' });

    const markdown = `# CEO Daily Briefing - ${date}

## Overview
- Unread inbox: ${data.overview.inboxUnread}
- Overdue tasks: ${data.overview.overdueTasks}
- Today's events: ${data.overview.todayEvents}
- Active tasks: ${data.tasks.pending} (${data.overview.overdueTasks} overdue)

## Strategic Priorities
${data.strategic.priorities.map(p => `- **${p.name}**: ${p.current} / ${p.target} ${p.metricLabel} (${p.percentage}%) — ${p.statusText}`).join('\n')}

## Revenue MTD
- Total: $${data.revenue.monthToDate.toLocaleString()} / $${data.revenue.monthTarget.toLocaleString()} (${data.revenue.monthPct}%)
- Yesterday Daily: $${data.revenue.daily.toLocaleString()}

## Notes
- Generated dynamically from live Hermes data at ${new Date().toISOString()}
`;

    return NextResponse.json({ markdown });
  } catch (error) {
    console.error('Error generating daily brief from Hermes:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate daily brief';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
