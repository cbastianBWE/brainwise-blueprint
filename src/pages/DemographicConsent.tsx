import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useToast } from "@/hooks/use-toast";

const PNTS = "Prefer not to say";

const ORG_SIZES = ["1-50", "51-200", "201-1000", "1001-5000", "5000+", PNTS];
const AGE_RANGES = ["Under 25", "25-34", "35-44", "45-54", "55-64", "65+", PNTS];
const GENDERS = ["Man", "Woman", "Non-binary", "Prefer to self-describe", PNTS];
const ETHNICITIES = [
  "American Indian or Alaska Native",
  "Asian",
  "Black or African American",
  "Hispanic or Latino",
  "Middle Eastern or North African",
  "Native Hawaiian or Other Pacific Islander",
  "White",
  "Multiracial",
  PNTS,
];
const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Argentina","Armenia","Australia",
  "Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium",
  "Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei",
  "Bulgaria","Burkina Faso","Burundi","Cambodia","Cameroon","Canada","Central African Republic",
  "Chad","Chile","China","Colombia","Comoros","Congo","Costa Rica","Croatia","Cuba","Cyprus",
  "Czech Republic","Denmark","Djibouti","Dominican Republic","Ecuador","Egypt","El Salvador",
  "Estonia","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana",
  "Greece","Guatemala","Guinea","Guyana","Haiti","Honduras","Hungary","Iceland","India",
  "Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan",
  "Kenya","Kuwait","Laos","Latvia","Lebanon","Libya","Lithuania","Luxembourg","Madagascar",
  "Malaysia","Maldives","Mali","Malta","Mexico","Moldova","Mongolia","Montenegro","Morocco",
  "Mozambique","Myanmar","Namibia","Nepal","Netherlands","New Zealand","Nicaragua","Niger",
  "Nigeria","North Macedonia","Norway","Oman","Pakistan","Panama","Paraguay","Peru","Philippines",
  "Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saudi Arabia","Senegal","Serbia",
  "Singapore","Slovakia","Slovenia","Somalia","South Africa","South Korea","Spain","Sri Lanka",
  "Sudan","Sweden","Switzerland","Syria","Taiwan","Tanzania","Thailand","Togo","Trinidad and Tobago",
  "Tunisia","Turkey","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States",
  "Uruguay","Uzbekistan","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe", PNTS,
];

const norm = (v: string) => (!v || v === PNTS ? null : v);

const DemographicConsent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [orgSize, setOrgSize] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [gender, setGender] = useState("");
  const [nationalOrigin, setNationalOrigin] = useState("");
  const [ethnicity, setEthnicity] = useState("");

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("user_demographics").upsert({
      user_id: user.id,
      consent_granted_at: new Date().toISOString(),
      org_size: norm(orgSize),
      age_range: norm(ageRange),
      gender_identity: norm(gender),
      national_origin: norm(nationalOrigin),
      racial_ethnic_identity: norm(ethnicity),
    }, { onConflict: "user_id" });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    await routeNext();
  };

  const handleSkip = async () => {
    await routeNext();
  };

  const routeNext = async () => {
    if (!user) {
      navigate("/dashboard");
      return;
    }
    const { data: u } = await supabase.from("users").select("account_type").eq("id", user.id).single();
    const isCorporate = ["corporate_employee", "company_admin", "org_admin", "brainwise_super_admin"].includes(u?.account_type ?? "");
    navigate(isCorporate ? "/peer-sharing-optin" : "/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <img src="/brain-icon.png" alt="BrainWise" className="mx-auto h-10 w-10 mb-2" />
          <CardTitle className="text-2xl">Optional: Help Us Understand Our Users</CardTitle>
          <CardDescription className="text-base leading-relaxed pt-2">
            We collect optional background information to improve our platform through aggregate research.
            This data is never shared with your employer, coach, or any third party in identifiable form.
            Providing it is entirely optional and you can withdraw consent at any time from your Privacy settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Organization Size</Label>
            <Select value={orgSize} onValueChange={setOrgSize}>
              <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
              <SelectContent>{ORG_SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Age Range</Label>
            <Select value={ageRange} onValueChange={setAgeRange}>
              <SelectTrigger><SelectValue placeholder="Select age range" /></SelectTrigger>
              <SelectContent>{AGE_RANGES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Gender Identity</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger><SelectValue placeholder="Select gender identity" /></SelectTrigger>
              <SelectContent>{GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>National Origin</Label>
            <Select value={nationalOrigin} onValueChange={setNationalOrigin}>
              <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
              <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Race / Ethnicity</Label>
            <Select value={ethnicity} onValueChange={setEthnicity}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{ETHNICITIES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground pt-2">
            By providing any information above, you consent to BrainWise using it solely for aggregate, de-identified research. You can withdraw this consent at any time.
          </p>

          <div className="flex flex-col gap-3 pt-2">
            <Button onClick={handleSave} disabled={loading} className="w-full">
              {loading ? "Saving..." : "Save and Continue"}
            </Button>
            <Button variant="outline" onClick={handleSkip} className="w-full">
              Skip
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DemographicConsent;
