export async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options?.headers,
    },
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result.error || "Ops, não deu certo dessa vez. Vamos tentar de novo?",
    );
  return result as T;
}
