import React, { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { Link } from "react-router-dom";
import { Trash2, UserPlus, Loader2, Check, Pencil, Plus } from "lucide-react";

const inputCls = "w-full rounded-xl border border-navy/15 px-4 py-3 font-body text-sm text-navy outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/20 transition-all";
const labelCls = "block font-heading text-xs font-semibold text-navy/70 uppercase tracking-wide mb-1.5";
const blankHub = {
  name: "",
  campus: "",
  neighborhood: "",
  coordinator_name: "",
  coordinator_contact: "",
  whatsapp_link: "",
  meeting_day: "",
  meeting_time: "",
  description: "",
  image_url: "",
  lat: "",
  lng: "",
  instagram_handle: "",
};

export default function AdminHubsAdmins() {
  const [hubs, setHubs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteHub, setInviteHub] = useState("");
  const [hubForm, setHubForm] = useState(blankHub);
  const [saving, setSaving] = useState(false);
  const [creatingHub, setCreatingHub] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    const [h, u] = await Promise.all([appClient.entities.Hub.list(), appClient.entities.User.list()]);
    setHubs(h); setUsers(u); setLoading(false);
  };
  useEffect(() => { load().catch(() => setLoading(false)); }, []);

  const hubName = (id) => hubs.find((h) => h.id === id)?.name || "—";
  const userHub = (u) => u.assigned_hub_id || u.data?.assigned_hub_id;

  const createHub = async (e) => {
    e.preventDefault();
    setCreatingHub(true);
    setMsg("");

    try {
      await appClient.entities.Hub.create({
        ...hubForm,
        lat: hubForm.lat === "" ? null : Number(hubForm.lat),
        lng: hubForm.lng === "" ? null : Number(hubForm.lng),
      });
      setHubForm(blankHub);
      setMsg("Hub created.");
      await load();
    } catch (err) {
      setMsg(err.message || "Hub create failed.");
    } finally {
      setCreatingHub(false);
      setTimeout(() => setMsg(""), 4000);
    }
  };

  const invite = async (e) => {
    e.preventDefault();
    if (!inviteEmail || !inviteHub) return;
    setSaving(true); setMsg("");
    try {
      await appClient.users.inviteUser(inviteEmail, "user");
      const refreshed = await appClient.entities.User.list();
      const found = refreshed.find((u) => u.email === inviteEmail);
      if (found) {
        await appClient.entities.User.update(found.id, { assigned_hub_id: inviteHub });
        setMsg("Invited & assigned!");
      } else {
        setMsg("Invited — assign after they register.");
      }
      setInviteEmail("");
      await load();
    } catch (err) {
      setMsg(err.message || "Invite failed.");
    } finally { setSaving(false); }
    setTimeout(() => setMsg(""), 4000);
  };

  const reassign = async (userId, hubId) => {
    try {
      await appClient.entities.User.update(userId, { assigned_hub_id: hubId || "" });
      await load();
    } catch (err) { setMsg(err.message || "Update failed."); setTimeout(() => setMsg(""), 4000); }
  };

  const deleteHub = async (id) => {
    if (!confirm("Delete this hub?")) return;
    await appClient.entities.Hub.delete(id);
    load();
  };

  if (loading) return <div className="rounded-2xl bg-white border border-navy/8 p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-saffron" /></div>;

  return (
    <div className="space-y-8">
      {msg && <div className="flex items-center gap-2 rounded-xl bg-river/10 border border-river/20 px-4 py-3 font-heading text-sm font-semibold text-river"><Check className="h-4 w-4" />{msg}</div>}

      <form onSubmit={createHub} className="rounded-2xl bg-white border border-navy/8 p-6">
        <h3 className="font-heading text-lg font-bold text-navy mb-4 flex items-center gap-2"><Plus className="h-5 w-5 text-saffron" />Create Hub</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className={labelCls}>Name</label><input value={hubForm.name} onChange={(e) => setHubForm({ ...hubForm, name: e.target.value })} className={inputCls} required /></div>
          <div><label className={labelCls}>Campus</label><input value={hubForm.campus} onChange={(e) => setHubForm({ ...hubForm, campus: e.target.value })} className={inputCls} required /></div>
          <div><label className={labelCls}>Neighborhood</label><input value={hubForm.neighborhood} onChange={(e) => setHubForm({ ...hubForm, neighborhood: e.target.value })} className={inputCls} required /></div>
          <div><label className={labelCls}>Coordinator Name</label><input value={hubForm.coordinator_name} onChange={(e) => setHubForm({ ...hubForm, coordinator_name: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Coordinator Contact</label><input value={hubForm.coordinator_contact} onChange={(e) => setHubForm({ ...hubForm, coordinator_contact: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>WhatsApp Link</label><input value={hubForm.whatsapp_link} onChange={(e) => setHubForm({ ...hubForm, whatsapp_link: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Meeting Day</label><input value={hubForm.meeting_day} onChange={(e) => setHubForm({ ...hubForm, meeting_day: e.target.value })} className={inputCls} placeholder="Thursday" /></div>
          <div><label className={labelCls}>Meeting Time</label><input value={hubForm.meeting_time} onChange={(e) => setHubForm({ ...hubForm, meeting_time: e.target.value })} className={inputCls} placeholder="6:30 PM" /></div>
          <div><label className={labelCls}>Latitude</label><input type="number" step="any" value={hubForm.lat} onChange={(e) => setHubForm({ ...hubForm, lat: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Longitude</label><input type="number" step="any" value={hubForm.lng} onChange={(e) => setHubForm({ ...hubForm, lng: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Image URL</label><input value={hubForm.image_url} onChange={(e) => setHubForm({ ...hubForm, image_url: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Instagram Handle</label><input value={hubForm.instagram_handle} onChange={(e) => setHubForm({ ...hubForm, instagram_handle: e.target.value })} className={inputCls} placeholder="gitalife312" /></div>
          <div className="sm:col-span-2"><label className={labelCls}>Description</label><textarea value={hubForm.description} onChange={(e) => setHubForm({ ...hubForm, description: e.target.value })} className={inputCls} rows={3} /></div>
        </div>
        <button type="submit" disabled={creatingHub} className="mt-4 flex items-center gap-2 rounded-xl bg-navy px-6 py-3 font-heading text-sm font-semibold text-white disabled:opacity-60">
          {creatingHub ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Create Hub
        </button>
      </form>

      <form onSubmit={invite} className="rounded-2xl bg-white border border-navy/8 p-6">
        <h3 className="font-heading text-lg font-bold text-navy mb-4 flex items-center gap-2"><UserPlus className="h-5 w-5 text-saffron" />Invite Hub Admin</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Admin Email</label>
            <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className={inputCls} placeholder="newadmin@uic.edu" required />
          </div>
          <div>
            <label className={labelCls}>Assign to Hub</label>
            <select value={inviteHub} onChange={(e) => setInviteHub(e.target.value)} className={inputCls} required>
              <option value="">Select hub…</option>
              {hubs.map((h) => <option key={h.id} value={h.id}>{h.name} ({h.campus})</option>)}
            </select>
          </div>
        </div>
        <button type="submit" disabled={saving} className="mt-4 flex items-center gap-2 rounded-xl bg-saffron px-6 py-3 font-heading text-sm font-semibold text-white disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}Invite & Assign
        </button>
      </form>

      <div className="rounded-2xl bg-white border border-navy/8 p-6">
        <h3 className="font-heading text-lg font-bold text-navy mb-4">Manage Admins</h3>
        <div className="space-y-2">
          {users.filter((u) => u.role !== "admin").map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-3 rounded-xl border border-navy/8 px-4 py-3">
              <div className="min-w-0">
                <p className="font-body text-sm font-medium text-navy truncate">{u.email}</p>
                <p className="font-body text-xs text-navy/50">{userHub(u) ? `Assigned: ${hubName(userHub(u))}` : "Unassigned"}</p>
              </div>
              <select value={userHub(u) || ""} onChange={(e) => reassign(u.id, e.target.value)} className="rounded-lg border border-navy/15 px-3 py-2 font-body text-xs text-navy">
                <option value="">Unassigned</option>
                {hubs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
          ))}
          {users.filter((u) => u.role !== "admin").length === 0 && <p className="font-body text-sm text-navy/50">No hub admins yet. Invite one above.</p>}
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-navy/8 p-6">
        <h3 className="font-heading text-lg font-bold text-navy mb-4">All Hubs</h3>
        <div className="space-y-2">
          {hubs.map((h) => (
            <div key={h.id} className="flex items-center justify-between gap-3 rounded-xl border border-navy/8 px-4 py-3">
              <div className="min-w-0">
                <p className="font-heading text-sm font-bold text-navy">{h.name}</p>
                <p className="font-body text-xs text-navy/50">{h.campus} · {h.neighborhood}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link to={`/admin/hub/${h.id}`} className="flex items-center gap-1 rounded-lg bg-navy/5 px-3 py-2 font-heading text-xs font-semibold text-navy hover:bg-navy/10"><Pencil className="h-3.5 w-3.5" />Edit</Link>
                <button onClick={() => deleteHub(h.id)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
