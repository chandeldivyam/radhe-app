// ./apps/frontend/src/features/notes/pages/HomePage.tsx
import { Outlet } from "react-router-dom"; // Import Outlet
import { NoteList } from "../components/NoteList";

export function HomePage() {
  // No longer need internal state for selectedNoteId
  // const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  return (
    // Grid structure remains the same
    <div className="grid h-full grid-cols-[280px_minmax(0,1fr)]"> {/* Adjust width as needed */}
      {/* Left Sidebar: Note List */}
      <NoteList
        // No longer pass selection logic down; NoteList handles navigation
        // onNoteSelect={handleNoteSelect}
        // selectedNoteId={selectedNoteId}
      />

      {/* Right Content Area: Rendered by nested routes */}
      <main className="flex flex-col overflow-hidden"> {/* Use flex-col and overflow-hidden */}
        {/* Outlet renders the matched child route: SelectNotePlaceholder or NoteViewer */}
        <Outlet />
      </main>
    </div>
  );
}

export default HomePage;