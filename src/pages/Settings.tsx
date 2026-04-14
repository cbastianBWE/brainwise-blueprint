import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, User, Globe, Bell, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const timezones = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Anchorage", "Pacific/Honolulu", "Europe/London", "Europe/Paris",
  "Europe/Berlin", "Asia/Tokyo", "Asia/Shanghai", "Asia/Kolkata",
  "Australia/Sydney", "Pacific/Auckland",
];

const dateFormats = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"];

const notificationKeys = [
  { key: "assessment_reminders", label: "Assessment Reminders" },
  { key: "coach_messages", label: "Coach Messages" },
  { key: "platform_updates", label: "Platform Updates" },
  { key: "new_results", label: "New Results Available" },
] as const;

const formatAccountType = (t: string | null) => {
  const map: Record<string, string> = {
    individual: "Individual",
    coach: "Coach",
    admin: "Admin",
    brainwise_super_admin: "Super Admin",
    corporate_employee: "Corporate Employee",
  };
  return map[t ?? ""] ?? t ?? "Unknown";
};

interface Notifications {
  assessment_reminders: boolean;
  coach_messages: boolean;
  platform_updates: boolean;
  new_results: boolean;
}

const defaultNotifications: Notifications = {
  assessment_reminders: true,
  coach_messages: true,
  platform_updates: true,
  new_results: true,
};

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [savedField, setSavedField] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [accountType, setAccountType] = useState<string | null>(null);
  const [timezone, setTimezone] = useState("America/New_York");
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
  const [notifications, setNotifications] = useState<Notifications>(defaultNotifications);

  const showSaved = useCallback((field: string) => {
    setSavedField(field);
    setTimeout(() => setSavedField(null), 2000);
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("users")
        .select("full_name, email, account_type, timezone, date_format, notifications")
        .eq("id", user.id)
        .single();
      if (error) {
        toast.error("Failed to load settings");
        setLoading(false);
        return;
      }
      setFullName(data.full_name ?? "");
      setEmail(data.email);
      setAccountType(data.account_type);
      setTimezone(data.timezone ?? "America/New_York");
      setDateFormat(data.date_format ?? "MM/DD/YYYY");
      setNotifications({ ...defaultNotifications, ...(data.notifications as Partial<Notifications> ?? {}) });
      setLoading(false);
    })();
  }, [user]);

  const saveName = async () => {
    const { error } = await supabase.from("users").update({ full_name: fullName }).eq("id", user!.id);
    if (error) { toast.error("Failed to save name"); return; }
    showSaved("name");
  };

  const saveEmail = async () => {
    const { error: authErr } = await supabase.auth.updateUser({ email });
    if (authErr) { toast.error(authErr.message); return; }
    toast.success("Confirmation email sent to your new address");
    showSaved("email");
  };

  const changePassword = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) { toast.error(error.message); return; }
    toast.success("Password reset email sent");
  };

  const savePreference = async (field: "timezone" | "date_format", value: string) => {
    if (field === "timezone") setTimezone(value);
    else setDateFormat(value);
    const updatePayload = field === "timezone" ? { timezone: value } : { date_format: value };
    const { error } = await supabase.from("users").update(updatePayload).eq("id", user!.id);
    if (error) { toast.error("Failed to save preference"); return; }
    showSaved(field);
  };

  const toggleNotification = async (key: keyof Notifications, value: boolean) => {
    const updated = { ...notifications, [key]: value };
    setNotifications(updated);
    const { error } = await supabase.from("users").update({ notifications: updated }).eq("id", user!.id);
    if (error) { toast.error("Failed to save notification setting"); return; }
    showSaved(key);
  };

  const deleteAccount = async () => {
    try {
      const { error } = await supabase.functions.invoke('delete-account');
      if (error) throw error;
      await signOut();
      navigate('/');
    } catch (err) {
      toast.error('Failed to delete account. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const SavedBadge = ({ field }: { field: string }) =>
    savedField === field ? <Badge variant="secondary" className="ml-2 text-xs">Saved</Badge> : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-bold">General Settings</h1>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" /> Profile
          </CardTitle>
          <CardDescription>Manage your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center">
              <Label htmlFor="fullName">Full Name</Label>
              <SavedBadge field="name" />
            </div>
            <div className="flex gap-2">
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              <Button size="sm" onClick={saveName}>Save</Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center">
              <Label htmlFor="email">Email</Label>
              <SavedBadge field="email" />
            </div>
            <div className="flex gap-2">
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Button size="sm" onClick={saveEmail}>Save</Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={changePassword}>Change Password</Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Account Type: <Badge variant="outline">{formatAccountType(accountType)}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5" /> Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center">
              <Label>Timezone</Label>
              <SavedBadge field="timezone" />
            </div>
            <Select value={timezone} onValueChange={(v) => savePreference("timezone", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz} value={tz}>{tz.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center">
              <Label>Date Format</Label>
              <SavedBadge field="date_format" />
            </div>
            <Select value={dateFormat} onValueChange={(v) => savePreference("date_format", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {dateFormats.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Language</Label>
              <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
            </div>
            <Select disabled value="en">
              <SelectTrigger><SelectValue placeholder="English (Default)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English (Default)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5" /> Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {notificationKeys.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor={key}>{label}</Label>
                <SavedBadge field={key} />
              </div>
              <Switch
                id={key}
                checked={notifications[key]}
                onCheckedChange={(v) => toggleNotification(key, v)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-destructive">
            <Trash2 className="h-5 w-5" /> Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete Account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your account and all associated data. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={deleteAccount}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete Account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
