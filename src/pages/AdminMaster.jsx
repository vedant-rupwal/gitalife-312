import React, { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { useSearchParams } from "react-router-dom";
import AccessDenied from "@/components/AccessDenied";
import SectionHeading from "@/components/ui/SectionHeading";
import AdminHubsAdmins from "@/components/admin/AdminHubsAdmins";
import AdminEvents from "@/components/admin/AdminEvents";
import AdminImpact from "@/components/admin/AdminImpact";
import AdminVolunteerOpportunities from "@/components/admin/AdminVolunteerOpportunities";
import AdminAIDrafts from "@/components/admin/AdminAIDrafts";
import AdminEmailSender from "@/components/admin/AdminEmailSender";
import AdminHubContacts from "@/components/admin/AdminHubContacts";
import AdminGallery from "@/components/admin/AdminGallery";
import { Building2, Calendar, BarChart3, Camera, HandHeart, Loader2, Mail, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminMaster() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab") || "hubs";
  const tab = ["hubs", "events", "volunteer", "gallery", "contacts", "ai", "email", "impact"].includes(requestedTab) ? requestedTab : "hubs";

  useEffect(() => {
    appClient.auth.me().then(setMe).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-cream"><Loader2 className="h-8 w-8 animate-spin text-saffron" /></div>;
  if (!me || me.role !== "admin") return <AccessDenied message="Only root administrators can access the master dashboard." />;

  const tabs = [
    { id: "hubs", label: "Hubs & Admins", icon: Building2 },
    { id: "events", label: "Events", icon: Calendar },
    { id: "volunteer", label: "Volunteer", icon: HandHeart },
    { id: "gallery", label: "Gallery", icon: Camera },
    { id: "contacts", label: "Contacts", icon: Users },
    { id: "ai", label: "AI Drafts", icon: Sparkles },
    { id: "email", label: "Email", icon: Mail },
    { id: "impact", label: "Impact", icon: BarChart3 },
  ];

  return (
    <div className="bg-cream min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <SectionHeading eyebrow="Root Console" title="Master Dashboard" subtitle="Manage all hubs, assign admins, and oversee community content." />
        <div className="flex flex-wrap gap-2 mb-8">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setSearchParams({ tab: t.id })} className={cn("flex items-center gap-2 rounded-xl px-5 py-3 font-heading text-sm font-semibold transition-all", tab === t.id ? "bg-navy text-white" : "bg-white text-navy/60 border border-navy/8 hover:bg-navy/5")}>
                <Icon className="h-4 w-4" />{t.label}
              </button>
            );
          })}
        </div>
        {tab === "hubs" && <AdminHubsAdmins />}
        {tab === "events" && <AdminEvents />}
        {tab === "volunteer" && <AdminVolunteerOpportunities />}
        {tab === "gallery" && <AdminGallery me={me} />}
        {tab === "contacts" && <AdminHubContacts />}
        {tab === "ai" && <AdminAIDrafts me={me} />}
        {tab === "email" && <AdminEmailSender me={me} />}
        {tab === "impact" && <AdminImpact />}
      </div>
    </div>
  );
}
