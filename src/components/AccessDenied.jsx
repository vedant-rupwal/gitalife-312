import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

export default function AccessDenied({ message = "You don't have access to this page." }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="font-heading text-2xl font-bold text-navy mb-2">Access Restricted</h2>
        <p className="font-body text-sm text-navy/60 mb-6">{message}</p>
        <Link to="/" className="inline-flex rounded-xl bg-navy px-6 py-3 font-heading text-sm font-semibold text-white">Back to Home</Link>
      </div>
    </div>
  );
}