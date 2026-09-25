import { RolePlaceholder } from "@/components/RolePlaceholder";

export default function Page() {
  return (
    <RolePlaceholder
      role="Loader"
      device="Tablet / phone (judged at phone size)"
      owner="#6"
      screens={["Trip list", "Load sheet (reverse stop order)", "Item check + shortfall flag"]}
    />
  );
}
