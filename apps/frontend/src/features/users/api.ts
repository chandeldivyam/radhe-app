// ./apps/frontend/src/features/users/api.ts
import { handleApiResponse } from "@/lib/utils";

const API_BASE_URL = import.meta.env.VITE_PUBLIC_API_URL || "http://localhost:8000/api";

export async function createUser(values: { email: string; password: string }) {
    const response = await fetch(`${API_BASE_URL}/user/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(values),
      credentials: 'include',
    });
  
    await handleApiResponse(response);
}