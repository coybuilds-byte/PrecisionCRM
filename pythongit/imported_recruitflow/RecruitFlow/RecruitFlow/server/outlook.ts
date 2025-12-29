import { Client } from '@microsoft/microsoft-graph-client';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=outlook',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Outlook not connected');
  }
  return accessToken;
}

export async function getUncachableOutlookClient() {
  const accessToken = await getAccessToken();

  return Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => accessToken
    }
  });
}

export interface CalendarEvent {
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: { displayName: string };
  body?: { contentType: string; content: string };
  attendees?: Array<{
    emailAddress: { address: string; name?: string };
    type: string;
  }>;
}

export async function createCalendarEvent(event: CalendarEvent): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    const client = await getUncachableOutlookClient();
    
    const result = await client
      .api('/me/calendar/events')
      .post(event);

    console.log('[Outlook] Calendar event created:', result.id);
    return { success: true, eventId: result.id };
  } catch (error) {
    console.error('[Outlook] Error creating calendar event:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function updateCalendarEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getUncachableOutlookClient();
    
    await client
      .api(`/me/calendar/events/${eventId}`)
      .patch(updates);

    console.log('[Outlook] Calendar event updated:', eventId);
    return { success: true };
  } catch (error) {
    console.error('[Outlook] Error updating calendar event:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getUncachableOutlookClient();
    
    await client
      .api(`/me/calendar/events/${eventId}`)
      .delete();

    console.log('[Outlook] Calendar event deleted:', eventId);
    return { success: true };
  } catch (error) {
    console.error('[Outlook] Error deleting calendar event:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getCalendarEvents(startDate: Date, endDate: Date): Promise<{ success: boolean; events?: any[]; error?: string }> {
  try {
    const client = await getUncachableOutlookClient();
    
    const result = await client
      .api('/me/calendar/calendarView')
      .query({
        startDateTime: startDate.toISOString(),
        endDateTime: endDate.toISOString()
      })
      .select('subject,start,end,location,attendees,bodyPreview')
      .get();

    return { success: true, events: result.value };
  } catch (error) {
    console.error('[Outlook] Error getting calendar events:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
