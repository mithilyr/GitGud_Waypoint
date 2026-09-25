import { RolePlaceholder } from "@/components/RolePlaceholder";

export default function Page() {
  return (
    <RolePlaceholder
      role="Driver"
      device="Phone, offline-first (judged at phone size)"
      owner="#6"
      screens={["Today's run", "Stop detail + proof of delivery", "Sync status"]}
    />
  );
}
