const BASE = '/api';

export class ApiError extends Error {
    constructor(message, status, errors = {}) {
        super(message);
        this.status = status;
        this.errors = errors;
    }
}

async function request(method, path, body) {
    const isForm = body instanceof FormData;

    const response = await fetch(`${BASE}${path}`, {
        method,
        headers: {
            Accept: 'application/json',
            ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}),
        },
        body: isForm ? body : body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 204) return null;

    const json = await response.json().catch(() => null);

    if (!response.ok) {
        throw new ApiError(json?.message ?? `Request failed (${response.status})`, response.status, json?.errors ?? {});
    }

    return json;
}

export const api = {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
    delete: (path, body) => request('DELETE', path, body),
};
