import { DEFAULT_API_URL } from "@/lib/utils/constants";

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${DEFAULT_API_URL}${path}`);

  if (!response.ok) {
    throw new Error("Pesalo API request failed");
  }

  return response.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${DEFAULT_API_URL}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error("Pesalo API request failed");
  }

  return response.json() as Promise<T>;
}
