"use client";

import { Users, Wallet } from "lucide-react";
import type { Participante } from "@/lib/types/dominio";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { PanelFinanciero } from "@/components/grupos/PanelFinanciero";
import { PanelParticipantes } from "@/components/grupos/PanelParticipantes";
import { PanelBaneados } from "@/components/grupos/PanelBaneados";

type Props = {
  grupoId: string;
  grupoNombre: string;
  participantes: Participante[];
  valorApuesta: number;
  /** Porcentajes de reparto del pozo (1.º/2.º/3.º lugar). */
  premios: { primero: number; segundo: number; tercero: number };
  /** % del pozo reservado a administración. */
  porcentajeAdmin: number;
  esAdmin: boolean;
};

/**
 * Contenido de la pestaña "Gente" (solo admin) dividido en dos sub-pestañas:
 * "Participantes" (listado + gestión) y "Financiero" (recaudo + comprobantes).
 *
 * Si la polla no tiene costo no hay nada financiero, así que se muestra solo el
 * listado sin sub-pestañas.
 */
export function TabsGente({
  grupoId,
  grupoNombre,
  participantes,
  valorApuesta,
  premios,
  porcentajeAdmin,
  esAdmin,
}: Props) {
  const conCosto = valorApuesta > 0;

  const seccionParticipantes = (
    <>
      <div className="flex items-end justify-between gap-3">
        <SectionHeader
          titulo="Participantes"
          sub={`${participantes.length} en el grupo`}
        />
        <PanelBaneados grupoId={grupoId} />
      </div>
      <PanelParticipantes
        grupoId={grupoId}
        grupoNombre={grupoNombre}
        participantes={participantes}
        valorApuesta={valorApuesta}
        esAdmin={esAdmin}
      />
    </>
  );

  // Sin costo: nada que mostrar en "Financiero" → solo el listado.
  if (!conCosto) {
    return <div className="space-y-3">{seccionParticipantes}</div>;
  }

  return (
    <Tabs defaultValue="participantes">
      <TabsList className="w-full">
        <TabsTrigger value="participantes" className="flex-1 gap-1.5">
          <Users className="size-4" aria-hidden />
          Participantes
        </TabsTrigger>
        <TabsTrigger value="financiero" className="flex-1 gap-1.5">
          <Wallet className="size-4" aria-hidden />
          Financiero
        </TabsTrigger>
      </TabsList>

      <TabsContent value="participantes" className="space-y-3">
        {seccionParticipantes}
      </TabsContent>

      <TabsContent value="financiero">
        <PanelFinanciero
          grupoId={grupoId}
          grupoNombre={grupoNombre}
          participantes={participantes}
          valorApuesta={valorApuesta}
          premios={premios}
          porcentajeAdmin={porcentajeAdmin}
        />
      </TabsContent>
    </Tabs>
  );
}
