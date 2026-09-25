import { RolePlaceholder } from "@/components/RolePlaceholder";

export default function Page() {
  return (
    <RolePlaceholder
      role="Store manager"
      device="Phone / desktop"
      owner="#6"
      screens={["Place order (cutoff countdown)", "Order status + ETA", "Deferral notice", "Confirm receipt / report issue"]}
    />
  );
}
