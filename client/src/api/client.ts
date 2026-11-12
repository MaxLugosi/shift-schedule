import type { BatchRequest, Employee, Shift, ShiftTemplate } from './types';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError('Нет соединения с сервером', 0);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (body as { message?: string } | null)?.message ?? `Ошибка сервера (${res.status})`;
    throw new ApiError(message, res.status);
  }
  return body as T;
}

export const api = {
  employees: (search?: string) =>
    request<Employee[]>(`/employees${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  templates: () => request<ShiftTemplate[]>('/templates'),
  shifts: (from: string, to: string) => request<Shift[]>(`/shifts?from=${from}&to=${to}`),
  saveBatch: (batch: BatchRequest) =>
    request<{ upserted: Shift[]; deleted: number }>('/shifts/batch', { method: 'PUT', body: JSON.stringify(batch) }),
  publish: (from: string, to: string) =>
    request<{ published: number; publishedAt: string }>('/schedule/publish', {
      method: 'POST',
      body: JSON.stringify({ from, to }),
    }),
};
