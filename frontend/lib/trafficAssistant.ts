import type { TrafficEvent, KPIMetrics } from '@/types';

export interface AssistantResponse {
  text: string;
  matchedEventIds: string[];
}

export function queryTrafficAssistant(
  query: string,
  events: TrafficEvent[],
  filteredEvents: TrafficEvent[],
  kpiMetrics: KPIMetrics | null
): AssistantResponse {
  const q = query.toLowerCase().trim();

  // Helper to extract integers or default
  const extractNumber = (str: string, defaultNum: number): number => {
    const match = str.match(/\b\d+\b/);
    return match ? parseInt(match[0], 10) : defaultNum;
  };

  // 1. Top X highest risk incidents
  if (
    q.includes('highest risk') ||
    (q.includes('top') &&
      (q.includes('risk') ||
        q.includes('incident') ||
        q.includes('congestion') ||
        q.includes('severity')))
  ) {
    const limit = extractNumber(q, 10);
    // Sort all events by congestion_risk_score descending
    const sorted = [...events]
      .sort((a, b) => b.congestion_risk_score - a.congestion_risk_score)
      .slice(0, limit);

    let text = `### 🚨 Top ${limit} Highest Risk Incidents\n\n`;
    text += `Below are the events currently carrying the highest traffic congestion risk scores in the database:\n\n`;
    text += `| Incident ID | Corridor | Cause | Congestion Score | Risk Level | Action |\n`;
    text += `| :--- | :--- | :--- | :---: | :---: | :--- |\n`;

    sorted.forEach((ev) => {
      text += `| **[${ev.id}](highlight://${ev.id})** | ${ev.corridor} | ${ev.event_cause
        .replace(/_/g, ' ')
        .toUpperCase()} | \`${ev.congestion_risk_score.toFixed(1)}\` | **${ev.congestion_label}** | ${ev.recommended_action || 'N/A'} |\n`;
    });

    text += `\n*Click on any Incident ID to locate and highlight it on the command center map.*`;

    return {
      text,
      matchedEventIds: sorted.map((ev) => ev.id),
    };
  }

  // 2. Accident count on corridor this month / general search
  if (
    q.includes('accident') ||
    q.includes('how many') ||
    q.includes('occurred') ||
    q.includes('count')
  ) {
    // Check if accident or another cause
    let causeKey = 'accident';
    let causeLabel = 'Accidents';
    if (q.includes('breakdown')) {
      causeKey = 'vehicle_breakdown';
      causeLabel = 'Vehicle Breakdowns';
    } else if (q.includes('tree')) {
      causeKey = 'tree_fall';
      causeLabel = 'Tree Falls';
    } else if (q.includes('water') || q.includes('flood') || q.includes('logging')) {
      causeKey = 'water_logging';
      causeLabel = 'Water Logging';
    } else if (q.includes('pothole') || q.includes('hole')) {
      causeKey = 'pot_holes';
      causeLabel = 'Potholes';
    } else if (q.includes('construction') || q.includes('work')) {
      causeKey = 'construction';
      causeLabel = 'Construction Works';
    }

    // Try to extract corridor
    let matchedCorridor = '';
    let targetCorridorQuery = '';

    if (q.includes('nh-53') || q.includes('nh 53')) {
      targetCorridorQuery = 'NH-53';
    } else if (q.includes('orr') || q.includes('outer ring road')) {
      matchedCorridor = 'ORR';
      targetCorridorQuery = 'ORR';
    } else if (q.includes('tumkur')) {
      matchedCorridor = 'Tumkur Road';
      targetCorridorQuery = 'Tumkur Road';
    } else if (q.includes('hosur')) {
      matchedCorridor = 'Hosur Road';
      targetCorridorQuery = 'Hosur Road';
    } else if (q.includes('bellary')) {
      matchedCorridor = 'Bellary Road';
      targetCorridorQuery = 'Bellary Road';
    } else if (q.includes('madras')) {
      matchedCorridor = 'Old Madras';
      targetCorridorQuery = 'Old Madras Road';
    } else if (q.includes('bannerghata')) {
      matchedCorridor = 'Bannerghata';
      targetCorridorQuery = 'Bannerghata Road';
    }

    // Determine month
    let monthNum = 3; // March is our dataset's primary month (3.0)
    let monthLabel = 'this month';
    if (q.includes('jan')) {
      monthNum = 1;
      monthLabel = 'January';
    } else if (q.includes('feb')) {
      monthNum = 2;
      monthLabel = 'February';
    } else if (q.includes('mar')) {
      monthNum = 3;
      monthLabel = 'March';
    } else {
      // Default to March 2024 since it's the primary month in our CSV
      monthNum = 3;
      monthLabel = 'March 2024';
    }

    // Filter events
    const matches = events.filter((ev) => {
      const matchCause = ev.event_cause === causeKey;
      const matchMonth = ev.event_month === monthNum;
      let matchCor = true;
      if (targetCorridorQuery === 'NH-53') {
        matchCor = ev.corridor.toLowerCase().includes('nh-53');
      } else if (matchedCorridor) {
        matchCor = ev.corridor.toLowerCase().includes(matchedCorridor.toLowerCase());
      }
      return matchCause && matchMonth && matchCor;
    });

    if (targetCorridorQuery === 'NH-53') {
      let text = `### 📊 Incident Report: Accidents on NH-53 (${monthLabel})\n\n`;
      text += `There are **0** accidents recorded on **NH-53** in the current dataset, as the loaded traffic data is focused on the **Bengaluru Municipal and Metropolitan corridor network**.\n\n`;
      text += `To help you analyze similar highway-level traffic risks, here is the breakdown of **${causeLabel}** across active corridors in the database for **${monthLabel}**:\n\n`;

      // Calculate accidents per corridor
      const corridorCounts: Record<
        string,
        { count: number; maxCongestion: number; avgCongestion: number }
      > = {};
      events
        .filter(
          (ev) =>
            ev.event_cause === causeKey &&
            ev.event_month === monthNum &&
            ev.corridor !== 'Non-corridor'
        )
        .forEach((ev) => {
          if (!corridorCounts[ev.corridor]) {
            corridorCounts[ev.corridor] = { count: 0, maxCongestion: 0, avgCongestion: 0 };
          }
          corridorCounts[ev.corridor].count++;
          corridorCounts[ev.corridor].avgCongestion += ev.congestion_risk_score;
          if (ev.congestion_risk_score > corridorCounts[ev.corridor].maxCongestion) {
            corridorCounts[ev.corridor].maxCongestion = ev.congestion_risk_score;
          }
        });

      text += `| Corridor | Accident Count | Avg Congestion Score | Peak Congestion |\n`;
      text += `| :--- | :---: | :---: | :---: |\n`;

      const sortedCorridors = Object.entries(corridorCounts)
        .map(([name, data]) => ({
          name,
          count: data.count,
          max: data.maxCongestion,
          avg: Math.round(data.avgCongestion / data.count),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      if (sortedCorridors.length > 0) {
        sortedCorridors.forEach((c) => {
          text += `| **${c.name}** | ${c.count} | \`${c.avg}\` | \`${c.max}\` |\n`;
        });
      } else {
        text += `| *No accidents recorded on major corridors in this month* | - | - | - |\n`;
      }

      return {
        text,
        matchedEventIds: [],
      };
    }

    // For real corridors or general query
    const corridorNameText = targetCorridorQuery
      ? `on **${targetCorridorQuery}**`
      : 'across all corridors';
    let text = `### 📊 Incident Report: ${causeLabel} ${corridorNameText} (${monthLabel})\n\n`;
    text += `Found **${matches.length}** ${causeLabel.toLowerCase()} matching these parameters.\n\n`;

    if (matches.length > 0) {
      text += `| Event ID | Corridor | Location | Congestion Score | Status | Details |\n`;
      text += `| :--- | :--- | :--- | :---: | :---: | :--- |\n`;
      matches.slice(0, 10).forEach((ev) => {
        text += `| **[${ev.id}](highlight://${ev.id})** | ${ev.corridor} | ${
          ev.address.split(',')[0]
        } | \`${ev.congestion_risk_score.toFixed(1)}\` | \`${ev.status.toUpperCase()}\` | ${
          ev.alert_description || 'N/A'
        } |\n`;
      });
      if (matches.length > 10) {
        text += `\n*... and ${matches.length - 10} more events. Use more filters to narrow down.*`;
      }
      text += `\n\n*Click on any Event ID to highlight it on the map.*`;
    } else {
      text += `No incidents matching these criteria were found. Here are some quick stats:\n`;
      text += `* Total loaded events of type **${causeKey}**: ${
        events.filter((ev) => ev.event_cause === causeKey).length
      }\n`;
      text += `* Total events in month **${monthLabel}**: ${
        events.filter((ev) => ev.event_month === monthNum).length
      }\n`;
    }

    return {
      text,
      matchedEventIds: matches.map((ev) => ev.id),
    };
  }

  // 3. Which corridor has the most road closures?
  if (
    q.includes('road closure') ||
    q.includes('closures') ||
    q.includes('closed road') ||
    q.includes('closure')
  ) {
    const closureEvents = events.filter(
      (ev) => ev.requires_road_closure || ev.road_closure_flag === 1
    );

    // Group closures by corridor
    const corridorMap: Record<
      string,
      { count: number; active: number; critical: number; events: string[] }
    > = {};
    closureEvents.forEach((ev) => {
      const c = ev.corridor || 'Non-corridor';
      if (!corridorMap[c]) {
        corridorMap[c] = { count: 0, active: 0, critical: 0, events: [] };
      }
      corridorMap[c].count++;
      if (ev.status === 'active') {
        corridorMap[c].active++;
      }
      if (ev.congestion_label === 'Severe Congestion') {
        corridorMap[c].critical++;
      }
      corridorMap[c].events.push(ev.id);
    });

    const sorted = Object.entries(corridorMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);

    const topCorridor = sorted[0];

    let text = `### 🚧 Road Closure Analysis & Corridor Hotspots\n\n`;
    if (topCorridor) {
      text += `The corridor with the highest frequency of road closures is **${topCorridor.name}** with **${topCorridor.count} total closures** (including **${topCorridor.active} currently active** closures).\n\n`;
      text += `#### Road Closures by Corridor:\n\n`;
      text += `| Corridor | Total Closures | Active Closures | Critical Impacts | Key Incidents |\n`;
      text += `| :--- | :---: | :---: | :---: | :--- |\n`;

      sorted.slice(0, 8).forEach((c) => {
        const topEventLinks = c.events
          .slice(0, 3)
          .map((id) => `[${id}](highlight://${id})`)
          .join(', ');
        text += `| **${c.name}** | ${c.count} | ${c.active} | ${c.critical} | ${topEventLinks} ${
          c.events.length > 3 ? '...' : ''
        } |\n`;
      });
      text += `\n*Click on any incident link to display it on the command map.*`;
    } else {
      text += `No road closures are currently recorded in the active dataset. Check if the road_closure fields are correctly parsed.`;
    }

    return {
      text,
      matchedEventIds: topCorridor ? topCorridor.events : [],
    };
  }

  // 4. Show active critical events near Raipur / near location
  if (
    q.includes('active critical') ||
    q.includes('critical events') ||
    (q.includes('critical') && q.includes('near')) ||
    q.includes('near') ||
    q.includes('around') ||
    q.includes('in Raipur')
  ) {
    // Extract location keyword
    const match = query.match(/(?:near|in|at|around)\s+([a-zA-Z0-9\s-]{3,})/i);
    const locationKeyword = match ? match[1].trim() : '';

    let matches: TrafficEvent[] = [];
    if (locationKeyword) {
      matches = events.filter((ev) => {
        const isActive = ev.status === 'active';
        const isCritical =
          ev.congestion_risk_score >= 70 || ev.congestion_label === 'Severe Congestion';
        const matchLoc =
          ev.address.toLowerCase().includes(locationKeyword.toLowerCase()) ||
          ev.police_station.toLowerCase().includes(locationKeyword.toLowerCase()) ||
          ev.zone.toLowerCase().includes(locationKeyword.toLowerCase()) ||
          ev.corridor.toLowerCase().includes(locationKeyword.toLowerCase());
        return isActive && isCritical && matchLoc;
      });
    }

    if (locationKeyword.toLowerCase() === 'raipur' || !locationKeyword || matches.length === 0) {
      const globalActiveCritical = events.filter(
        (ev) =>
          ev.status === 'active' &&
          (ev.congestion_risk_score >= 70 || ev.congestion_label === 'Severe Congestion')
      );

      let text = `### 📍 Active Critical Incidents near ${locationKeyword || 'Raipur'}\n\n`;
      text += `There are **0** active critical incidents near **${
        locationKeyword || 'Raipur'
      }** in our active database, as the system is configured for the **Bengaluru Metropolitan area**.\n\n`;
      text += `For operational dispatch, here are the **${globalActiveCritical.length} active critical incidents** requiring immediate response in the Bengaluru network:\n\n`;

      text += `| Event ID | Corridor | Location | Congestion Score | Police needed | Action Required |\n`;
      text += `| :--- | :--- | :--- | :---: | :---: | :--- |\n`;

      globalActiveCritical.slice(0, 8).forEach((ev) => {
        text += `| **[${ev.id}](highlight://${ev.id})** | ${ev.corridor} | ${
          ev.address.split(',')[0]
        } | \`${ev.congestion_risk_score.toFixed(1)}\` | ${ev.recommended_police} | ${
          ev.recommended_action || 'Deploy rapid response'
        } |\n`;
      });
      text += `\n*Select any incident ID to visualize it on the map and dispatch resources.*`;

      return {
        text,
        matchedEventIds: globalActiveCritical.map((ev) => ev.id),
      };
    }

    // Real matches
    let text = `### 📍 Active Critical Incidents near ${locationKeyword}\n\n`;
    text += `Found **${matches.length}** active critical incident(s) near **${locationKeyword}**:\n\n`;
    text += `| Event ID | Corridor | Specific Location | Score | Officers | Suggested Action |\n`;
    text += `| :--- | :--- | :--- | :---: | :---: | :--- |\n`;

    matches.forEach((ev) => {
      text += `| **[${ev.id}](highlight://${ev.id})** | ${ev.corridor} | ${
        ev.address.split(',')[0]
      } | \`${ev.congestion_risk_score.toFixed(1)}\` | ${ev.recommended_police} | ${
        ev.recommended_action || 'N/A'
      } |\n`;
    });

    text += `\n*Click on any Incident ID to inspect the coordinate mapping.*`;

    return {
      text,
      matchedEventIds: matches.map((ev) => ev.id),
    };
  }

  // 5. What are the peak congestion hours?
  if (
    q.includes('peak congestion hours') ||
    q.includes('congested hours') ||
    q.includes('peak hours') ||
    q.includes('worst hour') ||
    q.includes('time of day') ||
    q.includes('hour')
  ) {
    // Group events by event_hour
    const hourMap: Record<number, { count: number; totalScore: number; maxScore: number }> = {};
    events.forEach((ev) => {
      const h = ev.event_hour;
      if (h === undefined || isNaN(h)) return;
      if (!hourMap[h]) {
        hourMap[h] = { count: 0, totalScore: 0, maxScore: 0 };
      }
      hourMap[h].count++;
      hourMap[h].totalScore += ev.congestion_risk_score;
      if (ev.congestion_risk_score > hourMap[h].maxScore) {
        hourMap[h].maxScore = ev.congestion_risk_score;
      }
    });

    const sortedHours = Object.entries(hourMap)
      .map(([h, d]) => ({
        hour: parseInt(h, 10),
        count: d.count,
        avgScore: Math.round(d.totalScore / d.count),
        maxScore: d.maxScore,
      }))
      .sort((a, b) => b.avgScore - a.avgScore);

    const formatHourName = (h: number): string => {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayHour = h % 12 === 0 ? 12 : h % 12;
      return `${displayHour}:00 ${ampm}`;
    };

    let text = `### ⏰ Peak Congestion Hours Analysis\n\n`;
    text += `Based on our time-series analysis of the event dataset, the hours with the **highest average congestion risk scores** are:\n\n`;
    text += `| Hour Window | Avg Congestion Score | Max Risk Score | Event Density | Traffic Window |\n`;
    text += `| :--- | :---: | :---: | :---: | :--- |\n`;

    sortedHours.slice(0, 10).forEach((item, i) => {
      let windowLabel = 'Normal Commute';
      if (item.hour >= 8 && item.hour <= 10) windowLabel = '🌅 Morning Peak';
      else if (item.hour >= 17 && item.hour <= 20) windowLabel = '🌇 Evening Peak';
      else if (item.hour >= 22 || item.hour <= 4) windowLabel = '🌙 Night Freight';

      text += `| **${i + 1}. ${formatHourName(item.hour)}** | \`${
        item.avgScore
      }/100\` | \`${item.maxScore}\` | ${item.count} incidents | ${windowLabel} |\n`;
    });

    text += `\n#### 📈 Recommendations:\n`;
    text += `* **Pre-Positioning**: Pre-deploy towing and traffic control officers 30 minutes prior to the PM peak (starting at 4:30 PM), specifically around major junction choke points.\n`;
    text += `* **Maintenance Holds**: Restrict planned construction/metro utility work during peak periods (08:00 - 11:00 and 17:00 - 20:30).`;

    return {
      text,
      matchedEventIds: [],
    };
  }

  // 6. Summarize today's traffic situation
  if (
    q.includes('summarize today') ||
    q.includes("today's traffic") ||
    q.includes('traffic situation') ||
    q.includes('status report') ||
    q.includes('executive summary') ||
    q.includes('summary today')
  ) {
    const active = events.filter((ev) => ev.status === 'active');
    const critical = active.filter(
      (ev) => ev.congestion_risk_score >= 70 || ev.congestion_label === 'Severe Congestion'
    );
    const closures = active.filter((ev) => ev.requires_road_closure || ev.road_closure_flag === 1);
    const avgScore =
      active.length > 0
        ? Math.round(active.reduce((sum, ev) => sum + ev.congestion_risk_score, 0) / active.length)
        : 0;

    // Causes breakdown
    const causeCounts: Record<string, number> = {};
    active.forEach((ev) => {
      causeCounts[ev.event_cause] = (causeCounts[ev.event_cause] || 0) + 1;
    });

    let text = `### 📊 GridLocked Command Center: Today's Executive Traffic Summary\n`;
    text += `*Briefing generated on live operational network variables.*\n\n`;
    text += `#### 🚨 KEY OPERATIONAL METRICS:\n`;
    text += `* **Active Incidents**: **${active.length}** currently active events.\n`;
    text += `* **Critical Congestion Hotspots**: **${critical.length}** locations showing extreme congestion risk (Score $\\ge 70$).\n`;
    text += `* **Road Closures In Effect**: **${closures.length}** segments blocked, requiring police detours.\n`;
    text += `* **Average Network Congestion**: \`${avgScore}/100\` (Status: **${
      avgScore >= 60 ? 'HIGH DELAY' : 'MODERATE'
    }**).\n\n`;

    text += `#### 📈 INCIDENTS BY CAUSE:\n`;
    const causeTable = Object.entries(causeCounts)
      .map(([cause, count]) => `* **${cause.replace(/_/g, ' ').toUpperCase()}**: ${count} active`)
      .join('\n');
    text += causeTable || `*No active incidents in the network currently.*`;
    text += `\n\n`;

    text += `#### ⚠️ TOP URGENT DISPATCH PRIORITY EVENTS:\n`;
    if (critical.length > 0) {
      text += `| Incident ID | Corridor | Location | Score | Recommended Dispatch Action |\n`;
      text += `| :--- | :--- | :--- | :---: | :--- |\n`;
      critical.slice(0, 3).forEach((ev) => {
        text += `| **[${ev.id}](highlight://${ev.id})** | ${ev.corridor} | ${
          ev.address.split(',')[0]
        } | \`${ev.congestion_risk_score.toFixed(1)}\` | ${
          ev.recommended_action || 'Deploy officers'
        } |\n`;
      });
      text += `\n*Select any Incident ID to visualize it on the map and dispatch resources.*`;
    } else {
      text += `*No critical events registered. Network flow within normal limits.*`;
    }

    return {
      text,
      matchedEventIds: critical.map((ev) => ev.id),
    };
  }

  // Fallback: General keyword / pattern search in the dataset
  let matchedEvents = events;
  const filtersApplied = [];

  // Check cause
  const causes = [
    'accident',
    'vehicle_breakdown',
    'tree_fall',
    'water_logging',
    'pot_holes',
    'construction',
    'congestion',
    'road_conditions',
  ];
  for (const c of causes) {
    if (q.includes(c) || q.includes(c.replace(/_/g, ' '))) {
      matchedEvents = matchedEvents.filter((ev) => ev.event_cause === c);
      filtersApplied.push(`Cause: ${c.replace(/_/g, ' ').toUpperCase()}`);
    }
  }

  // Check corridor
  const corridors = [
    'tumkur road',
    'orr east 1',
    'orr east 2',
    'orr west 1',
    'orr north 1',
    'orr north 2',
    'old madras road',
    'bellary road 2',
    'bellary road 1',
    'hosur road',
    'bannerghata road',
    'magadi road',
  ];
  for (const corr of corridors) {
    if (q.includes(corr)) {
      matchedEvents = matchedEvents.filter((ev) => ev.corridor.toLowerCase().includes(corr));
      filtersApplied.push(`Corridor: ${corr.toUpperCase()}`);
    }
  }

  // Check status
  if (q.includes('active') || q.includes('live')) {
    matchedEvents = matchedEvents.filter((ev) => ev.status === 'active');
    filtersApplied.push(`Status: ACTIVE`);
  } else if (q.includes('resolved') || q.includes('closed')) {
    matchedEvents = matchedEvents.filter((ev) => ev.status === 'resolved' || ev.status === 'closed');
    filtersApplied.push(`Status: RESOLVED/CLOSED`);
  }

  if (filtersApplied.length > 0) {
    let text = `### 🔍 Traffic Intelligence Search Results\n\n`;
    text += `Searched the dataset using filters: **${filtersApplied.join(', ')}**\n\n`;
    text += `Found **${matchedEvents.length}** matching incidents.\n\n`;

    if (matchedEvents.length > 0) {
      text += `| Event ID | Corridor | Location | Cause | Score | Status | Action |\n`;
      text += `| :--- | :--- | :--- | :---: | :---: | :---: | :--- |\n`;
      matchedEvents.slice(0, 10).forEach((ev) => {
        text += `| **[${ev.id}](highlight://${ev.id})** | ${ev.corridor} | ${
          ev.address.split(',')[0]
        } | ${ev.event_cause.replace(/_/g, ' ').toUpperCase()} | \`${ev.congestion_risk_score.toFixed(
          1
        )}\` | \`${ev.status.toUpperCase()}\` | ${ev.recommended_action || 'N/A'} |\n`;
      });
      if (matchedEvents.length > 10) {
        text += `\n*... and ${
          matchedEvents.length - 10
        } more events. Click on an Incident ID to display it on the map.*`;
      }
    } else {
      text += `No incidents matched the filters. Try typing general keywords like "accidents", "ORR", "active", "closures" or "peak hours".`;
    }

    return {
      text,
      matchedEventIds: matchedEvents.map((ev) => ev.id),
    };
  }

  // Generic fallback chatbot response
  return {
    text: `🤖 **Traffic Intelligence Assistant**\n\nI can help you query and analyze the traffic dataset. Try asking queries such as:\n\n* "Show top 10 highest risk incidents"\n* "How many accidents occurred on NH-53 this month?" (or on real corridors like "ORR" or "Tumkur Road")\n* "Which corridor has the most road closures?"\n* "Show active critical events near Raipur" (or real locations like "Hebbal" or "HSR Layout")\n* "What are the peak congestion hours?"\n* "Summarize today's traffic situation"`,
    matchedEventIds: [],
  };
}
