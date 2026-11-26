"use client";

import Link from "next/link";
import { brand } from "@/config/brand";

const VerifyPage = () => {
  return (
    <div className="flex flex-col items-center gap-4 text-center py-8">
      <div className="w-10 h-10 rounded-full bg-accent-muted flex items-center justify-center">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-accent"
          aria-hidden="true"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-text-primary">
          Check your email
        </p>
        <p className="text-sm text-text-secondary mt-1">
          Click the confirmation link we sent to your email to activate your{" "}
          {brand.name} account.
        </p>
      </div>
      <Link
        href="/login"
        className="text-xs text-text-secondary hover:text-text-primary transition-colors"
      >
        Back to sign in
      </Link>
    </div>
  );
};

export default VerifyPage;
