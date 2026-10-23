import { useState } from "react";
import api from "./services/api";

function App() {
  const [isLogin, setIsLogin] = useState(false);
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  });

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "Citizen",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      if (isLogin) {
        const response = await api.post("/auth/login", {
          email: form.email,
          password: form.password,
        });

        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        setUser(response.data.user);
        setMessage("");
      } else {
        const response = await api.post("/auth/register", form);
        setMessage(response.data.message + "! You can now log in.");
        setIsLogin(true);
        setForm({
          name: "",
          email: form.email,
          password: "",
          role: "Citizen",
        });
      }
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Request failed. Check the backend.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setIsLogin(true);
    setMessage("You have logged out.");
  };

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-8 text-center shadow-lg">
          <h1 className="text-3xl font-bold text-blue-700">SocialConnect</h1>
          <h2 className="text-xl font-semibold">Welcome, {user.name}!</h2>
          <p>Your role: {user.role}</p>
          <p>You are logged in successfully.</p>
          <button
            onClick={handleLogout}
            className="w-full rounded-lg bg-red-600 p-3 font-semibold text-white hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 rounded-2xl bg-white p-8 shadow-lg"
      >
        <h1 className="text-3xl font-bold text-center text-blue-700">
          SocialConnect
        </h1>
        <p className="text-center text-gray-500">
          {isLogin ? "Sign in to your account" : "Create your account"}
        </p>

        {!isLogin && (
          <input
            className="w-full rounded-lg border p-3"
            name="name"
            placeholder="Full name"
            value={form.name}
            onChange={handleChange}
            required
          />
        )}

        <input
          className="w-full rounded-lg border p-3"
          name="email"
          type="email"
          placeholder="Email address"
          value={form.email}
          onChange={handleChange}
          required
        />

        <input
          className="w-full rounded-lg border p-3"
          name="password"
          type="password"
          placeholder="Password (minimum 8 characters)"
          minLength={8}
          value={form.password}
          onChange={handleChange}
          required
        />

        {!isLogin && (
          <select
            className="w-full rounded-lg border bg-white p-3"
            name="role"
            value={form.role}
            onChange={handleChange}
          >
            <option value="Citizen">Citizen</option>
            <option value="Donor">Donor</option>
            <option value="NGO">NGO</option>
          </select>
        )}

        <button
          className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          type="submit"
          disabled={loading}
        >
          {loading ? "Please wait..." : isLogin ? "Login" : "Register"}
        </button>

        {message && (
          <p className="text-center text-sm text-gray-700" role="status">
            {message}
          </p>
        )}

        <p className="text-center text-sm text-gray-600">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="font-semibold text-blue-600 hover:underline"
            onClick={() => {
              setIsLogin(!isLogin);
              setMessage("");
            }}
          >
            {isLogin ? "Register" : "Login"}
          </button>
        </p>
      </form>
    </div>
  );
}

export default App;
