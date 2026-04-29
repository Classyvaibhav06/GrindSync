import { SectionLoading } from "@/components/social-grind/SectionLoading";

export default function ProfileLoading() {
  return (
    <SectionLoading
      title="Loading profile"
      subtitle="Fetching user details"
      rows={3}
    />
  );
}
