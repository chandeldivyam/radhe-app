import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function handleApiResponse(response: Response) {
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