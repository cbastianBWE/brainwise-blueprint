import AdminLearningTree from "@/components/learning-admin/AdminLearningTree";
import { useToast } from "@/hooks/use-toast";

interface Props {
  userId: string;
}

export default function MemberDrawerLearning({ userId }: Props) {
  const { toast } = useToast();
  return (
    <div className="p-4">
      <AdminLearningTree
        userId={userId}
        isImpersonating={false}
        onMark={() => {
          toast({
            title: "Available in cycle 2a",
            description: "Completion controls will be wired up in the next update.",
          });
        }}
      />
    </div>
  );
}
