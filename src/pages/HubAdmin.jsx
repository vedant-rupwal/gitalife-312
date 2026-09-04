import React, { useState, useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { appClient } from "@/api/appClient";
import AccessDenied from "@/components/AccessDenied";
import SectionHeading from "@/components/ui/SectionHeading";
import HubInfoForm from "@/components/admin/HubInfoForm";
import HubEventsManager from "@/components/admin/HubEventsManager";
import HubContactsManager from "@/components/admin/HubContactsManager";
import AdminVolunteerOpportunities from "@/components/admin/AdminVolunteerOpportunities";
import AdminAIDrafts from "@/components/admin/AdminAIDrafts";
import AdminEmailSender from "@/components/admin/AdminEmailSender";
import { ArrowLeft, Calendar, ExternalLink, HandHeart, Info, Loader2, Mail, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export default function HubAdmin() {
  const { hubId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const requestedTab = searchParams.get("tab") || "info";
  const tab = ["info", "events", "volunteer", "contacts", "email", "ai"].includes(requestedTab) ? requestedTab : "info";

  useEffect(() => {
    appClient.auth.me().then(setMe).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-cream"><Loader2 className="h-8 w-8 animate-spin text-saffron" /></div>;
  const assigned = me?.assigned_hub_id || me?.data?.assigned_hub_id;
  const assignedHubs = me?.assigned_hub_ids || me?.data?.assigned_hub_ids || [];
  if (!me || (me.role !== "admin" && assigned !== hubId && !assignedHubs.includes(hubId))) return <AccessDenied message="You can only manage the hub you're assigned to." />;

  const tabs = [
    { id: "info", label: "Hub Info", icon: Info },
    { id: "events", label: "Events", icon: Calendar },
    { id: "volunteer", label: "Volunteer", icon: HandHeart },
    { id: "contacts", label: "Contacts", icon: Users },
    { id: "email", label: "Email", icon: Mail },
    { id: "ai", label: "AI Drafts", icon: Sparkles },
  ];

  return (
    <div className="bg-cream min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {me.role === "admin" && (
            <Link to="/admin" className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 font-heading text-sm font-semibold text-navy border border-navy/8 hover:bg-navy/5">
              <ArrowLeft className="h-4 w-4" />Root Console
            </Link>
          )}
          <Link to={`/hubs/${hubId}`} target="_blank" className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 font-heading text-sm font-semibold text-white hover:bg-navy/90">
            <ExternalLink className="h-4 w-4" />Preview Hub
          </Link>
        </div>
        <SectionHeading eyebrow="Hub Admin" title="Manage Your Hub" subtitle="Edit your hub's info and create events for your community." />
        <div className="mb-8 flex flex-wrap gap-2">
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setSearchParams({ tab: item.id })}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-5 py-3 font-heading text-sm font-semibold transition-all",
                  tab === item.id ? "bg-navy text-white" : "border border-navy/8 bg-white text-navy/60 hover:bg-navy/5",
                )}
              >
                <Icon className="h-4 w-4" />{item.label}
              </button>
            );
          })}
        </div>
        {tab === "info" && <HubInfoForm hubId={hubId} />}
        {tab === "events" && <HubEventsManager hubId={hubId} />}
        {tab === "volunteer" && <AdminVolunteerOpportunities hubId={hubId} />}
        {tab === "contacts" && <HubContactsManager hubId={hubId} />}
        {tab === "email" && <AdminEmailSender me={me} hubId={hubId} />}
        {tab === "ai" && <AdminAIDrafts me={me} hubId={hubId} />}
      </div>
    </div>
  );
}
