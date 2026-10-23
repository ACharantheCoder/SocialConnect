import { useAuth } from "../context/AuthContext";

function CitizenDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between bg-blue-600 px-6 py-4 text-white">
        <h1 className="text-xl font-bold">SocialConnect</h1>

        <div className="flex items-center gap-4">
          <span>
            {user.name} ({user.role})
          </span>

          <button
            onClick={logout}
            className="rounded bg-white px-3 py-1 font-medium text-blue-600"
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl p-6">
        <h2 className="mb-2 text-2xl font-semibold">Citizen Dashboard</h2>

        <p className="text-gray-600">Your help requests will appear here.</p>
      </main>
    </div>
  );
}

export default CitizenDashboard;
