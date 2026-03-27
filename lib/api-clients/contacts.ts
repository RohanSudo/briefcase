const PEOPLE_BASE = "https://people.googleapis.com/v1";

export interface Contact {
  name: string;
  emails: string[];
  phones: string[];
  organization: string;
}

export async function searchContacts(
  accessToken: string,
  query: string,
  maxResults = 10
): Promise<Contact[]> {
  const params = new URLSearchParams({
    query,
    readMask: "names,emailAddresses,phoneNumbers,organizations",
    pageSize: String(maxResults),
  });

  const res = await fetch(`${PEOPLE_BASE}/people:searchContacts?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Contacts search failed: ${res.status}`);
  const data = await res.json();

  return (data.results || []).map(
    (r: {
      person: {
        names?: Array<{ displayName: string }>;
        emailAddresses?: Array<{ value: string }>;
        phoneNumbers?: Array<{ value: string }>;
        organizations?: Array<{ name: string }>;
      };
    }) => ({
      name: r.person.names?.[0]?.displayName || "Unknown",
      emails: (r.person.emailAddresses || []).map((e) => e.value),
      phones: (r.person.phoneNumbers || []).map((p) => p.value),
      organization: r.person.organizations?.[0]?.name || "",
    })
  );
}

export async function listContacts(
  accessToken: string,
  maxResults = 20
): Promise<Contact[]> {
  const params = new URLSearchParams({
    pageSize: String(maxResults),
    personFields: "names,emailAddresses,phoneNumbers,organizations",
    sortOrder: "LAST_MODIFIED_DESCENDING",
  });

  const res = await fetch(
    `${PEOPLE_BASE}/people/me/connections?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Contacts list failed: ${res.status}`);
  const data = await res.json();

  return (data.connections || []).map(
    (c: {
      names?: Array<{ displayName: string }>;
      emailAddresses?: Array<{ value: string }>;
      phoneNumbers?: Array<{ value: string }>;
      organizations?: Array<{ name: string }>;
    }) => ({
      name: c.names?.[0]?.displayName || "Unknown",
      emails: (c.emailAddresses || []).map((e) => e.value),
      phones: (c.phoneNumbers || []).map((p) => p.value),
      organization: c.organizations?.[0]?.name || "",
    })
  );
}
