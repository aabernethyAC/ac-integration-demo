/**
 * Minimal ActiveCampaign v3 API client.
 */
export function createAcClient({ apiUrl, apiToken }) {
  const baseUrl = `${apiUrl.replace(/\/$/, "")}/api/3`;

  async function request(method, path, body) {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        "Api-Token": apiToken,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      const err = new Error(
        `AC API ${method} ${path} failed (${res.status}): ${text}`
      );
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  return {
    get: (path) => request("GET", path),
    post: (path, body) => request("POST", path, body),
    put: (path, body) => request("PUT", path, body),
  };
}
