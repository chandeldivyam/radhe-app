// frontend/src/features/auth/api.ts
import { refreshAuth } from "../sync/zero-setup";
import type { LoginCredentials, SignupCredentials } from "./types";

const API_BASE_URL = import.meta.env.VITE_PUBLIC_API_URL || "http://localhost:8000/api";

async function handleApiResponse(response: Response) {
    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            console.log(e);
        }
        console.error("API Error:", response.status, response.statusText, errorData);
        throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

export async function loginUser(credentials: LoginCredentials): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        credentials: 'include',
    });

    await handleApiResponse(response);
    refreshAuth();
}

export async function signupUser(credentials: SignupCredentials): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        credentials: 'include',
    });

    await handleApiResponse(response);

    refreshAuth();
}