import { RolePlaceholder } from "@/components/RolePlaceholder";

export default function Page() {
  return (
    <RolePlaceholder
      role="Dispatcher"
      device="Desktop ≥1280px"
      owner="#5 / #6"
      screens={["Order queue", "Plan board", "Deferral panel", "Live run board", "Demand outlook"]}
    />
  );
}
