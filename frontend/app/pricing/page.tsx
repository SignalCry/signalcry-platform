import Link from "next/link";
import { APP_NAME } from "../../src/constants/app";

export default function PricingPage() {
  return (
    <main className="text-black">
      <section className="py-10">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {APP_NAME} Pro Waitlist
          </h1>
          <p className="mt-3 text-base text-black/70">
            We’re opening Pro access soon. This page will host the waitlist signup.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-md border border-black/15 bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              Back to Home
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              Open Dashboard
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
