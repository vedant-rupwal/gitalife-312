import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { appClient } from "@/api/appClient";
import AccessDenied from "@/components/AccessDenied";
import SectionHeading from "@/components/ui/SectionHeading";
import HubInfoForm from "@/components/admin/HubInfoForm";
import HubEventsManager from "@/components/admin/HubEventsManager";
import { Loader2 } from "lucide-react";

export default function HubAdmin() {
  const { hubId } = useParams();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    appClient.auth.me().then(setMe).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-cream"><Loader2 className="h-8 w-8 animate-spin text-saffron" /></div>;
  const assigned = me?.assigned_hub_id || me?.data?.assigned_hub_id;
  if (!me || (me.role !== "admin" && assigned !== hubId)) return <AccessDenied message="You can only manage the hub you're assigned to." />;

  return (
    <div className="bg-cream min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <SectionHeading eyebrow="Hub Admin" title="Manage Your Hub" subtitle="Edit your hub's info and create events for your community." />
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <HubInfoForm hubId={hubId} />
          <HubEventsManager hubId={hubId} />
        </div>
      </div>
    </div>
  );
}