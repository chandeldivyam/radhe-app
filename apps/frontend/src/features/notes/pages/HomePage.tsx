// ./apps/frontend/src/features/notes/pages/HomePage.tsx
import { Outlet } from "react-router-dom"; // Import Outlet
import { NoteList } from "../components/NoteList";

export function HomePage() {
  return (
    <div className="grid h-full grid-cols-[280px_minmax(0,1fr)]">
      <NoteList />

      <main className="flex flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}

export default HomePage;