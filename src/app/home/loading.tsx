import { SectionLoading } from "@/components/social-grind/SectionLoading";

export default function HomeLoading() {
  return (
    <SectionLoading
      title="Loading home"
      subtitle="Fetching your dashboard"
      rows={4}
    />
  );
}
