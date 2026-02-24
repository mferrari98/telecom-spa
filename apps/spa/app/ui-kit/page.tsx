import { ModuleShell } from "@telecom/ui";
import { PortalLayout } from "../../components/portal-layout";
import { ShadcnDemo } from "../../components/shadcn-demo";

export default function UiKitPage() {
  return (
    <PortalLayout>
      <ModuleShell
        title="UI Kit"
        description="Sandbox para incorporar y validar componentes shadcn antes de usarlos en modulos migrados."
      >
        <ShadcnDemo />
      </ModuleShell>
    </PortalLayout>
  );
}
