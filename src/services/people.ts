import { GoogleContact } from "../types";

export const fetchGoogleContacts = async (accessToken: string): Promise<GoogleContact[]> => {
  try {
    const response = await fetch(
      "https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers&pageSize=100",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Google People API error: ${await response.text()}`);
    }

    const data = await response.json();
    if (!data.connections) {
      return [];
    }

    return data.connections.map((conn: any) => {
      const name = conn.names?.[0]?.displayName || "Unnamed Connection";
      const email = conn.emailAddresses?.[0]?.value || undefined;
      const phone = conn.phoneNumbers?.[0]?.value || undefined;
      const id = conn.resourceName?.split("/")[1] || Math.random().toString();

      return {
        id,
        name,
        email,
        phone,
      };
    });
  } catch (error) {
    console.error("Failed to fetch Google Contacts:", error);
    return []; // Return empty array on failure instead of crashing
  }
};
