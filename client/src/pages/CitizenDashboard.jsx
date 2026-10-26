import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const FLAIRS = ["Urgent", "Help Needed", "Awareness", "Community"];

const emptyForm = {
  title: "",
  description: "",
  type: "food",
  city: "",
  quantity: 1,
  flair: "Help Needed",
};

const flairColors = {
  Urgent: "bg-red-100 text-red-700 border-red-200",
  "Help Needed": "bg-blue-100 text-blue-700 border-blue-200",
  Awareness: "bg-amber-100 text-amber-700 border-amber-200",
  Community: "bg-green-100 text-green-700 border-green-200",
};

function FlairBadge({ flair }) {
  const label = flair || "Help Needed";

  return (
    <span
      className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${
        flairColors[label] || flairColors["Help Needed"]
      }`}
    >
      {label}
    </span>
  );
}

export default function CitizenDashboard() {
  const { user, logout } = useAuth();

  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/help-requests");
      setRequests(response.data.requests || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not load your help requests.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: name === "quantity" ? Number(value) : value,
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (editingId) {
        await api.put(`/help-requests/${editingId}`, form);
        setMessage("Help request updated successfully.");
      } else {
        await api.post("/help-requests", form);
        setMessage("Help request created successfully.");
      }

      resetForm();
      await loadRequests();
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not save your help request.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (request) => {
    setForm({
      title: request.title || "",
      description: request.description || "",
      type: request.type || "food",
      city: request.city || "",
      quantity: request.quantity || 1,
      flair: request.flair || "Help Needed",
    });

    setEditingId(request._id);
    setError("");
    setMessage("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancel = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this request?",
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await api.patch(`/help-requests/${id}/cancel`);
      setMessage("Help request cancelled.");
      await loadRequests();
    } catch (err) {
      setError(err.response?.data?.message || "Could not cancel the request.");
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">SocialConnect</h1>
            <p className="text-sm text-slate-500">Your community, connected.</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline">
              Welcome, {user?.name || "Citizen"}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[380px_1fr]">
        <section className="h-fit rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            {editingId ? "Edit Help Request" : "Create Help Request"}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {editingId
              ? "Update the details of your pending request."
              : "Tell your community what kind of help is needed."}
          </p>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          {message && (
            <p
              role="status"
              className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
            >
              {message}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Request title *
              </label>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                required
                maxLength={120}
                placeholder="e.g. Food needed for a family"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Description
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                maxLength={2000}
                placeholder="Explain the help required..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Request type *
              </label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              >
                <option value="food">Food</option>
                <option value="blood">Blood</option>
                <option value="clothing">Clothing</option>
                <option value="medicine">Medicine</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">City *</label>
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                required
                maxLength={100}
                placeholder="Enter your city"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Quantity</label>
              <input
                name="quantity"
                type="number"
                min="1"
                max="100000"
                value={form.quantity}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Request flair *
              </label>
              <div className="flex flex-wrap gap-2">
                {FLAIRS.map((flair) => (
                  <button
                    key={flair}
                    type="button"
                    onClick={() =>
                      setForm((previous) => ({ ...previous, flair }))
                    }
                    aria-pressed={form.flair === flair}
                    className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                      form.flair === flair
                        ? `${flairColors[flair]} ring-2 ring-offset-1 ring-slate-400`
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {flair}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Request"
                    : "Submit Request"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border px-4 py-3 hover:bg-slate-100"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </section>

        <section>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">My Help Requests</h2>
              <p className="mt-1 text-sm text-slate-500">
                Manage the requests you have created.
              </p>
            </div>

            <button
              onClick={loadRequests}
              disabled={loading}
              className="rounded-lg border bg-white px-3 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-60"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="rounded-xl border bg-white p-8 text-center text-slate-500">
              Loading your requests...
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-white p-10 text-center">
              <h3 className="font-semibold">No help requests yet</h3>
              <p className="mt-2 text-sm text-slate-500">
                Create your first request using the form.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <article
                  key={request._id}
                  className="rounded-2xl border bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold">{request.title}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {request.type} · {request.city} · Quantity:{" "}
                        {request.quantity}
                      </p>
                    </div>

                    <FlairBadge flair={request.flair} />
                  </div>

                  {request.description && (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {request.description}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          request.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : request.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : request.status === "cancelled"
                                ? "bg-slate-100 text-slate-600"
                                : request.status === "rejected"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {request.status}
                      </span>

                      <span className="text-xs text-slate-400">
                        {request.createdAt
                          ? new Date(request.createdAt).toLocaleDateString()
                          : ""}
                      </span>
                    </div>

                    {request.status === "pending" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(request)}
                          className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleCancel(request._id)}
                          className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                        >
                          Cancel Request
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
