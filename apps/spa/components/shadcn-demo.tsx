"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, CalendarClock, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

export function ShadcnDemo() {
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date());

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Portal</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>UI Kit</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Buttons + Badges</CardTitle>
              <Badge variant="secondary">Activo</Badge>
            </div>
            <CardDescription>Variantes listas para acciones primarias y secundarias.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button>Primario</Button>
              <Button variant="secondary">Secundario</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alert + Alert Dialog</CardTitle>
            <CardDescription>Mensajeria y confirmaciones criticas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Integracion completada</AlertTitle>
              <AlertDescription>
                El set base de componentes shadcn ya esta instalado en la SPA.
              </AlertDescription>
            </Alert>

            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Accion sensible</AlertTitle>
              <AlertDescription>
                Las operaciones de cierre deben tener confirmacion explicita.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">Probar confirmacion</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar operacion</AlertDialogTitle>
                  <AlertDialogDescription>
                    Este es un ejemplo de `AlertDialog` para acciones irreversibles.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction>Confirmar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Calendar</CardTitle>
            <Badge variant="outline" className="font-normal">
              <CalendarClock className="mr-1 h-3.5 w-3.5" />
              {selectedDay ? selectedDay.toLocaleDateString("es-AR") : "Sin fecha"}
            </Badge>
          </div>
          <CardDescription>Calendario de referencia para turnos y programacion.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-auto">
          <Calendar mode="single" selected={selectedDay} onSelect={setSelectedDay} />
        </CardContent>
      </Card>
    </div>
  );
}
