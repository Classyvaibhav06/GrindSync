import { SectionLoading } from "@/components/social-grind/SectionLoading";

export default function LoginLoading() {
  return (
    <SectionLoading
      title="Loading login"
      subtitle="Preparing sign-in"
      rows={2}
    />
  );
}
