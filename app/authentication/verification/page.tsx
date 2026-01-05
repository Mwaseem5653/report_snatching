"use client";

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-green-100">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4">Verify Your Email</h1>
        <p className="text-gray-600">
          We have sent a verification link to your email. Please check and verify
          before logging in.
        </p>
      </div>
    </div>
  );
}
