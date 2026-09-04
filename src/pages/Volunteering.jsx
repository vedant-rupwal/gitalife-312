import React, { useEffect, useState } from "react";
import { Calendar, HandHeart, MapPin, Users } from "lucide-react";
import { appClient } from "@/api/appClient";
import SectionHeading from "@/components/ui/SectionHeading";
import VolunteerSignupModal from "@/components/volunteer/VolunteerSignupModal";

const formatDate = (value) => {
  if (!value) return "Flexible timing";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function Volunteering() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [signupOpportunity, setSignupOpportunity] = useState(null);

  useEffect(() => {
    appClient.entities.VolunteerOpportunity.list("starts_at", 50)
      .then((rows) => setOpportunities(rows.filter((row) => row.is_active !== false)))
      .catch(() => setOpportunities([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <SectionHeading
          eyebrow="Volunteer"
          title="Serve With GitaLife 312"
          subtitle="Find a seva opportunity, sign up, and a coordinator will follow up with the details."
        />

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, index) => <div key={index} className="h-72 animate-pulse rounded-2xl bg-white" />)}
          </div>
        ) : opportunities.length === 0 ? (
          <div className="rounded-2xl border border-navy/8 bg-white p-10 text-center">
            <HandHeart className="mx-auto mb-4 h-10 w-10 text-saffron" />
            <p className="font-body text-navy/60">No volunteer opportunities are posted yet.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {opportunities.map((opportunity) => (
              <div key={opportunity.id} className="rounded-2xl border border-navy/8 bg-white p-6 shadow-sm">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-saffron/10 text-saffron">
                  <HandHeart className="h-6 w-6" />
                </div>
                <h3 className="font-heading text-xl font-bold text-navy">{opportunity.title}</h3>
                <p className="mt-2 min-h-[48px] font-body text-sm leading-relaxed text-navy/60">{opportunity.description || "Details coming soon."}</p>
                <div className="mt-5 space-y-2 font-body text-xs text-navy/60">
                  <p className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-saffron" />{formatDate(opportunity.starts_at)}</p>
                  <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-saffron" />{opportunity.location || "Location coming soon"}</p>
                  {opportunity.needed_count ? (
                    <p className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-saffron" />{opportunity.signup_count || 0}/{opportunity.needed_count} volunteers</p>
                  ) : null}
                </div>
                {opportunity.role_details && <p className="mt-4 rounded-xl bg-cream px-4 py-3 font-body text-xs text-navy/65">{opportunity.role_details}</p>}
                <button onClick={() => setSignupOpportunity(opportunity)} className="mt-5 w-full rounded-xl bg-navy px-5 py-3 font-heading text-sm font-semibold text-white transition-all hover:scale-[1.02]">
                  Sign Up to Volunteer
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {signupOpportunity && <VolunteerSignupModal opportunity={signupOpportunity} onClose={() => setSignupOpportunity(null)} />}
    </div>
  );
}
