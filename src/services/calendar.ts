import { Task } from "../types";

// Helper to construct end time (usually 1 hour after start time)
const getEndTime = (startIso: string): string => {
  const d = new Date(startIso);
  if (isNaN(d.getTime())) {
    // Fallback if date is invalid split or missing
    return new Date().toISOString();
  }
  d.setHours(d.getHours() + 1);
  return d.toISOString();
};

export const createCalendarEvent = async (
  accessToken: string,
  task: Task,
  createMeet: boolean = false
): Promise<{ eventId: string; meetLink: string | null }> => {
  try {
    const endIso = getEndTime(task.deadline || new Date().toISOString());
    const startIso = new Date(task.deadline || new Date().toISOString()).toISOString();

    const body: any = {
      summary: task.title,
      description: task.description || "Task synced with Workspace Assistant",
      start: {
        dateTime: startIso,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      },
      end: {
        dateTime: endIso,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      },
    };

    if (createMeet) {
      body.conferenceData = {
        createRequest: {
          requestId: `meet_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      };
    }

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(`Google Calendar API Error: ${errorMsg}`);
    }

    const data = await response.json();
    const eventId = data.id;
    let meetLink: string | null = null;

    if (data.conferenceData?.entryPoints) {
      const videoEntryPoint = data.conferenceData.entryPoints.find(
        (ep: any) => ep.entryPointType === "video"
      );
      if (videoEntryPoint) {
        meetLink = videoEntryPoint.uri;
      }
    }

    return { eventId, meetLink };
  } catch (error) {
    console.error("Failed to create Google Calendar Event:", error);
    throw error;
  }
};

export const updateCalendarEvent = async (
  accessToken: string,
  eventId: string,
  task: Task,
  createMeet: boolean = false
): Promise<{ meetLink: string | null }> => {
  try {
    const endIso = getEndTime(task.deadline || new Date().toISOString());
    const startIso = new Date(task.deadline || new Date().toISOString()).toISOString();

    const body: any = {
      summary: task.title,
      description: task.description || "",
      start: {
        dateTime: startIso,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      },
      end: {
        dateTime: endIso,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      },
    };

    if (createMeet && !task.meetLink) {
      body.conferenceData = {
        createRequest: {
          requestId: `meet_${Date.now()}_update`,
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      };
    }

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}?conferenceDataVersion=1`;
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Google Calendar Event Update Failed: ${await response.text()}`);
    }

    const data = await response.json();
    let meetLink = task.meetLink;

    if (data.conferenceData?.entryPoints) {
      const videoEntryPoint = data.conferenceData.entryPoints.find(
        (ep: any) => ep.entryPointType === "video"
      );
      if (videoEntryPoint) {
        meetLink = videoEntryPoint.uri;
      }
    }

    return { meetLink };
  } catch (error) {
    console.error("Failed to update Google Calendar Event", error);
    throw error;
  }
};

export const deleteCalendarEvent = async (
  accessToken: string,
  eventId: string
): Promise<void> => {
  try {
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Google Calendar Event Deletion Failed: ${await response.text()}`);
    }
  } catch (error) {
    console.error("Failed to delete Google Calendar Event", error);
    throw error;
  }
};
