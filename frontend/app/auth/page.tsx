"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/hooks/useAuth";

export default function AuthPage() {
  const router = useRouter();
  const { login, signup, requestSignupCode } = useAuth();

  const [isSignup, setIsSignup] = useState(false);
  const [verificationStep, setVerificationStep] = useState(false);

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const resetMessages = () => {
    setError("");
    setSuccessMessage("");
  };

  const resetSignupFlow = () => {
    setVerificationStep(false);
    setVerificationCode("");
    resetMessages();
  };

  const handleRequestCode = async () => {
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const result = await requestSignupCode(email, username, password);

    if (!result.success) {
      setError(result.message || "Failed to send verification code");
      return;
    }

    setVerificationStep(true);
    setSuccessMessage("Verification code sent to your email.");
  };

  const handleCreateAccount = async () => {
    if (!verificationCode) {
      setError("Verification code is required");
      return;
    }

    const result = await signup(email, username, password, verificationCode);

    if (!result.success) {
      setError(result.message || "Failed to create account");
      return;
    }

    router.push("/");
  };

  const handleLogin = async () => {
    const result = await login(email, password);

    if (!result.success) {
      setError(result.message || "Invalid email or password");
      return;
    }

    router.push("/");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      if (isSignup) {
        if (verificationStep) {
          await handleCreateAccount();
        } else {
          await handleRequestCode();
        }
      } else {
        await handleLogin();
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 text-6xl text-gray-500">₿</div>
        <div className="absolute bottom-20 right-20 text-6xl text-gray-500">Ξ</div>
        <div className="absolute top-1/3 right-10 text-5xl text-gray-500">◆</div>
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="text-4xl font-bold text-white mb-2">
            Signal X
          </div>
          <p className="text-gray-500 text-sm">
            Crypto Intelligence Platform
          </p>
        </div>

        <div className="backdrop-blur-xl bg-gray-900 rounded-2xl p-8 border border-gray-700 shadow-2xl">
          <div className="flex gap-2 mb-8">
            <button
              type="button"
              onClick={() => {
                setIsSignup(false);
                resetSignupFlow();
              }}
              className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
                !isSignup
                  ? "bg-white text-black shadow-lg"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => {
                setIsSignup(true);
                resetSignupFlow();
              }}
              className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
                isSignup
                  ? "bg-white text-black shadow-lg"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              Sign Up
            </button>
          </div>

          {isSignup && verificationStep && (
            <div className="mb-6 p-4 rounded-lg bg-gray-800 border border-gray-700">
              <p className="text-sm text-gray-300">
                We sent a 6-digit verification code to:
              </p>
              <p className="text-white font-semibold mt-1">{email}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!verificationStep && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all"
                    placeholder="you@example.com"
                    required
                  />
                </div>

                {isSignup && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all"
                      placeholder="your_username"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                    required
                  />
                  {isSignup && (
                    <p className="text-xs text-gray-400 mt-1">
                      Min. 6 characters
                    </p>
                  )}
                </div>

                {isSignup && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                )}
              </>
            )}

            {isSignup && verificationStep && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all tracking-widest text-center text-xl"
                  placeholder="123456"
                  maxLength={6}
                  required
                />

                <button
                  type="button"
                  onClick={async () => {
                    resetMessages();
                    setLoading(true);

                    try {
                      await handleRequestCode();
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="mt-3 text-sm text-gray-400 hover:text-white transition-all"
                >
                  Resend code
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setVerificationStep(false);
                    setVerificationCode("");
                    resetMessages();
                  }}
                  className="ml-4 mt-3 text-sm text-gray-400 hover:text-white transition-all"
                >
                  Change email
                </button>
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/50 text-green-300 text-sm">
                {successMessage}
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-6 rounded-lg font-semibold text-black bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              {loading
                ? "Processing..."
                : isSignup
                  ? verificationStep
                    ? "Verify & Create Account"
                    : "Send Verification Code"
                  : "Login"}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-500 text-xs mt-6">
          Join thousands of traders tracking crypto signals in real-time
        </p>
      </div>
    </div>
  );
}