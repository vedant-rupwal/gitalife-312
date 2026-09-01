import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, MailCheck } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { appClient } from "@/api/appClient";
import { Button } from "@/components/ui/button";

const passwordTypes = new Set(["recovery", "invite"]);

export default function AuthConfirm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type") || "email";
    const next = searchParams.get("next");

    if (!tokenHash) {
      setError("This confirmation link is missing a token.");
      return;
    }

    appClient.auth.verifyTokenHash({ tokenHash, type })
      .then(() => {
        if (passwordTypes.has(type)) {
          navigate("/reset-password", { replace: true });
          return;
        }

        navigate(next || "/dashboard", { replace: true });
      })
      .catch((err) => {
        setError(err.message || "This confirmation link is invalid or expired.");
      });
  }, [navigate, searchParams]);

  return (
    <AuthLayout
      icon={MailCheck}
      title={error ? "Link problem" : "Confirming link"}
      subtitle={error || "One moment while we confirm your email link."}
    >
      {error ? (
        <Button asChild className="w-full h-12 font-medium">
          <Link to="/forgot-password">Request a new link</Link>
        </Button>
      ) : (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-saffron" />
        </div>
      )}
    </AuthLayout>
  );
}
