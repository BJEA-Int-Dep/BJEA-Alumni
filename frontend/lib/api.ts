export class ApiRequestError extends Error {
  constructor(
    message: string,
    public status: number,
    public retryable = false,
  ) {
    super(message);
  }
}

export async function readApiResponse<T>(
  response: Response,
  fallbackMessage = '请求失败，请稍后重试。',
): Promise<T> {
  const text = await response.text();
  if (!text.trim())
    throw new ApiRequestError(
      response.ok ? '服务没有返回完整结果，请重试。' : fallbackMessage,
      response.status,
      true,
    );

  let body: T & { error?: string };
  try {
    body = JSON.parse(text) as T & { error?: string };
  } catch {
    throw new ApiRequestError(
      response.ok ? '服务返回的结果不完整，请重试。' : fallbackMessage,
      response.status,
      true,
    );
  }
  if (!response.ok)
    throw new ApiRequestError(
      body.error || fallbackMessage,
      response.status,
      response.status >= 500,
    );
  return body;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: init.body
      ? { 'Content-Type': 'application/json', ...init.headers }
      : init.headers,
  });
  return readApiResponse<T>(response);
}
