import MyLearningTab from "@/components/resources/MyLearningTab";
import MyNotesSection from "@/components/resources/MyNotesSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MyLearning() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-6 text-2xl font-semibold">My Learning</h1>
      <Tabs defaultValue="learning">
        <TabsList>
          <TabsTrigger value="learning">My Learning</TabsTrigger>
          <TabsTrigger value="notes">My Notes</TabsTrigger>
        </TabsList>
        <TabsContent value="learning" className="mt-4 space-y-4">
          <MyLearningTab />
        </TabsContent>
        <TabsContent value="notes" className="mt-4 space-y-4">
          <MyNotesSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
