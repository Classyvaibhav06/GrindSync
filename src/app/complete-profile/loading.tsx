import { SectionLoading } from "@/components/social-grind/SectionLoading";

export default function CompleteProfileLoading() {
  return (
    <SectionLoading
      title="Loading profile setup"
      subtitle="Finishing your account"
      rows={2}
    />
  );
}
