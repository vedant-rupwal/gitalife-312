import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { appClient } from "@/api/appClient";
import AccessDenied from "@/components/AccessDenied";
import SectionHeading from "@/components/ui/SectionHeading";
import HubInfoForm from "@/components/admin/HubInfoForm";
import HubEventsManager from "@/components/admin/HubEventsManager";
import HubContactsManager from "@/components/admin/HubContactsManager";
import AdminVolunteerOpportunities from "@/components/admin/AdminVolunteerOpportunities";
import AdminAIDrafts from "@/components/admin/AdminAIDrafts";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";

export default function HubAdmin() {
  const { hubId } = useParams();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    appClient.auth.me().then(setMe).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-cream"><Loader2 className="h-8 w-8 animate-spin text-saffron" /></div>;
  const assigned = me?.assigned_hub_id || me?.data?.assigned_hub_id;
  const assignedHubs = me?.assigned_hub_ids || me?.data?.assigned_hub_ids || [];
  if (!me || (me.role !== "admin" && assigned !== hubId && !assignedHubs.includes(hubId))) return <AccessDenied message="You can only manage the hub you're assigned to." />;

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
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-8">
            <HubInfoForm hubId={hubId} />
            <HubContactsManager hubId={hubId} />
          </div>
          <div className="space-y-8">
            <HubEventsManager hubId={hubId} />
            <AdminVolunteerOpportunities hubId={hubId} />
            <AdminAIDrafts me={me} hubId={hubId} />
          </div>
        </div>
      </div>
    </div>
  );
}
