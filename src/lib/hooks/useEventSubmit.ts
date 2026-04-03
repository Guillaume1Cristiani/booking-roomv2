"use client";

import { FormValues } from "@/app/data/events";
import {
  createEvent,
  deleteEvent,
  updateEvent,
} from "@/app/utils/queries";
import { EventsResponseWithParentEventsDate, Room } from "@/components/Calendar/types/types";
import { formatInTimeZone } from "date-fns-tz";
import { fr } from "date-fns/locale";
import { Dispatch, SetStateAction, useState } from "react";
import toast from "react-hot-toast";

interface UseEventSubmitOptions {
  eventInfos: EventsResponseWithParentEventsDate;
  roomOptions: Room[];
  setisModalOpen: Dispatch<SetStateAction<boolean>>;
  updateSSEdata: (event: { id: number }, op: string) => void;
  updateIsNewPreviewDisplay: (val: boolean) => void;
  updateCreatePreviewInfos: (val: { dates: { dateStart: string; dateEnd: string }; origin: string }) => void;
}

export function useEventSubmit({
  eventInfos,
  roomOptions,
  setisModalOpen,
  updateSSEdata,
  updateIsNewPreviewDisplay,
  updateCreatePreviewInfos,
}: UseEventSubmitOptions) {
  const [isDisable, setDisable] = useState<boolean>(false);

  const onSubmit = async (data: FormValues) => {
    if (!roomOptions.some((item) => item.name === data.subTag_id)) return;

    setDisable(true);

    const room = roomOptions.find((item) => item.name === data.subTag_id);
    const roomName = room?.name ?? String(data.subTag_id);
    data.subTag_id = room?.id ?? data.subTag_id;

    if (eventInfos.id === -42) {
      // Create
      const toastCreate = toast.loading("Chargement...");
      try {
        const res = await createEvent(data);
        if (res?.id != null) {
          toast.success(
            `${roomName} réservée le ${formatInTimeZone(
              data.dateStart,
              "Europe/Paris",
              "dd-MM-yyyy",
              { locale: fr }
            )} de ${formatInTimeZone(
              data.dateStart,
              "Europe/Paris",
              "HH:mm",
              { locale: fr }
            )} à ${formatInTimeZone(
              data.dateEnd,
              "Europe/Paris",
              "HH:mm",
              { locale: fr }
            )}`,
            { id: toastCreate }
          );
          setisModalOpen(false);
          updateSSEdata({ id: -42 }, "delete");
        } else {
          toast.error(
            res?.error
              ? typeof res.error === "string"
                ? res.error
                : "Données invalides"
              : (res?.message ?? "Erreur lors de la création"),
            { id: toastCreate }
          );
        }
      } catch (error) {
        console.error("Error creating event:", error);
        toast.error("Erreur lors de la création de l'évènement", { id: toastCreate });
      } finally {
        setDisable(false);
      }
    } else {
      // Update
      data.id = eventInfos.id;
      try {
        const res = await updateEvent(data, true);
        if (res?.status === 403) {
          updateIsNewPreviewDisplay(false);
          updateCreatePreviewInfos({
            dates: { dateStart: "", dateEnd: "" },
            origin: "",
          });
          toast.error(res?.error);
        } else {
          toast.success("Évènement a été modifié avec succès");
          setisModalOpen(false);
        }
      } catch (e) {
        toast.error("Erreur serveur");
      } finally {
        setDisable(false);
      }
    }
  };

  const handleDeleteEvent = () => {
    toast.promise(deleteEvent(eventInfos), {
      loading: "Loading",
      success: "Évènement supprimé avec succès",
      error: "Erreur dans la suppression de l'évènement",
    });
    setisModalOpen(false);
  };

  return { onSubmit, handleDeleteEvent, isDisable };
}
