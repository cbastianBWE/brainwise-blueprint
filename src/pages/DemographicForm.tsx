import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ROLES = ["Individual Contributor", "Manager", "Director", "VP/SVP", "C-Suite", "Other"];
const INDUSTRIES = [
  "Agriculture", "Automotive", "Banking & Finance", "Construction", "Consulting",
  "Education", "Energy & Utilities", "Entertainment & Media", "Government",
  "Healthcare", "Hospitality & Tourism", "Information Technology", "Insurance",
  "Legal", "Manufacturing", "Mining", "Non-Profit", "Pharmaceuticals",
  "Real Estate", "Retail", "Telecommunications", "Transportation & Logistics", "Other",
];
const ORG_SIZES = ["1-50", "51-200", "201-1000", "1001-5000", "5000+"];
const EXPERIENCE = ["0-2", "3-5", "6-10", "11-20", "20+"];
const AGE_RANGES = ["Under 25", "25-34", "35-44", "45-54", "55-64", "65+"];
const GENDERS = ["Man", "Woman", "Non-binary", "Prefer to self-describe", "Prefer not to say"];

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
  "Uruguay","Uzbekistan","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe","Prefer not to say",
];

const DemographicForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [role, setRole] = useState("");
  const [industry, setIndustry] = useState("");
  const [orgSize, setOrgSize] = useState("");
  const [experience, setExperience] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [gender, setGender] = useState("");
  const [nationalOrigin, setNationalOrigin] = useState("");

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);

    const { error } = await supabase.from("user_demographics").upsert({
      user_id: user.id,
      role_in_org: role || null,
      industry: industry || null,
      org_size: orgSize || null,
      years_experience: experience || null,
      age_range: ageRange || null,
      gender_identity: gender || null,
      national_origin: nationalOrigin || null,
    }, { onConflict: "user_id" });

    setLoading(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <Brain className="mx-auto h-10 w-10 text-primary mb-2" />
          <CardTitle className="text-2xl">Tell Us About Yourself</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Role in Organization</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue placeholder="Select your role" /></SelectTrigger>
              <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Industry</Label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger><SelectValue placeholder="Select your industry" /></SelectTrigger>
              <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Organization Size</Label>
            <Select value={orgSize} onValueChange={setOrgSize}>
              <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
              <SelectContent>{ORG_SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Years of Professional Experience</Label>
            <Select value={experience} onValueChange={setExperience}>
              <SelectTrigger><SelectValue placeholder="Select experience" /></SelectTrigger>
              <SelectContent>{EXPERIENCE.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="border-t pt-4 space-y-4">
            <div className="space-y-2">
              <Label>Age Range <span className="text-muted-foreground text-xs ml-1">Optional</span></Label>
              <Select value={ageRange} onValueChange={setAgeRange}>
                <SelectTrigger><SelectValue placeholder="Select age range" /></SelectTrigger>
                <SelectContent>{AGE_RANGES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Gender Identity <span className="text-muted-foreground text-xs ml-1">Optional</span></Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger><SelectValue placeholder="Select gender identity" /></SelectTrigger>
                <SelectContent>{GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground italic">
                This is a sensitive optional field used only in aggregate research.
              </p>
              <Label>National Origin <span className="text-muted-foreground text-xs ml-1">Optional</span></Label>
              <Select value={nationalOrigin} onValueChange={setNationalOrigin}>
                <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button onClick={handleSave} disabled={loading} className="w-full">
              {loading ? "Saving..." : "Save and Continue"}
            </Button>
            <Button variant="ghost" onClick={() => navigate("/dashboard")} className="w-full text-muted-foreground">
              Skip
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DemographicForm;
