import { PortalLayout } from "@/components/portal-layout";
import { PedidosClient } from "./pedidos-client";

export default function PedidosPage() {
  return (
    <PortalLayout>
      <PedidosClient />
    </PortalLayout>
  );
}
