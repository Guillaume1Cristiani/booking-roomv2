// @ts-nocheck
import { useCalendarStore } from "@/app/calendar/providers/calendar-store-provider";
import { FormValues } from "@/app/data/events";
import {
  createEvent,
  deleteEvent,
  getConflictsRooms,
  updateEvent,
} from "@/app/utils/queries";
import { EventsResponseWithParentEventsDate } from "@/components/Calendar/types/types";
import {
  ClockIcon,
  Cross1Icon,
  HomeIcon,
  Pencil1Icon,
  PersonIcon,
  TextAlignLeftIcon,
  TextIcon,
} from "@radix-ui/react-icons";
import { PopoverArrow } from "@radix-ui/react-popover";
import { useQuery } from "@tanstack/react-query";
import { Command } from "cmdk";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { fr } from "date-fns/locale";
import { Dispatch, SetStateAction, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import toast from "react-hot-toast";

export const EventForm = ({
  eventInfos,
  isEditable,
  setisModalOpen,
}: {
  eventInfos: EventsResponseWithParentEventsDate;
  isEditable: boolean | undefined;
  setisModalOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  const state = useCalendarStore((state) => state);
  const roomOptions = state.rooms;

  const { register, handleSubmit, setValue, reset, watch } =
    useForm<FormValues>({
      defaultValues: {
        subTag_id:
          eventInfos.subTag_id === -1
            ? ""
            : roomOptions.find((item) => item.id === eventInfos.subTag_id)
                ?.name,
      },
    });
  const dateStart = watch("dateStart");
  const subTag_id = watch("subTag_id");
  const [isDisable, setDisable] = useState<boolean>(false);

  const [isDisplayRooms, setisDisplayRooms] = useState<boolean>(false);

  const {
    data: items = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["items"],
    queryFn: () =>
      getConflictsRooms(
        eventInfos.id,
        eventInfos.dateStart,
        eventInfos.dateEnd
      ),
    enabled: isDisplayRooms, // Only fetch when the menu is open
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    // ID === -1 CREATE else PUT
    setDisable(true);
    if (roomOptions.some((item) => item.name === data.subTag_id)) {
      const findRoombySubtag = roomOptions.find(
        (item) => item.name === data.subTag_id
      )?.tag_id;
      data.subTag_id = findRoombySubtag;
      if (eventInfos.id === -42) {
        const toastCreate = toast.loading("Chargement...");
        try {
          const res = await createEvent(data);
          if (res.status === 200) {
            toast.success(
              `Salle ${data.name} pour ${formatInTimeZone(
                data.dateStart,
                "Europe/Paris",
                "dd-MM-yyyy HH:mm",
                { locale: fr }
              )} à ${formatInTimeZone(
                data.dateEnd,
                "Europe/Paris",
                "dd-MM-yyyy HH:mm",
                { locale: fr }
              )} réservée`,
              { id: toastCreate }
            );
            setisModalOpen(false);
            state.updateSSEdata({ id: -42 }, "delete");
          } else {
            toast.error(res?.message ?? "Erreur lors de la création", { id: toastCreate });
          }
        } catch (error) {
          console.error("Error creating event:", error);
          toast.error("Erreur lors de la création de l'évènement", { id: toastCreate });
        } finally {
          setDisable(false);
        }
      } else {
        data.id = eventInfos.id;
        try {
          const res = await updateEvent(data, true);
          if (res?.status === 403 && toast?.error) {
            state.updateIsNewPreviewDisplay(false);
            state.updateCreatePreviewInfos({
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
    }
  };

  const handleDeleteEvent = () => {
    toast.promise(deleteEvent(eventInfos), {
      loading: "Loading",
      success: `Évènement supprimé avec succès`,
      error: "Erreur dans la suppression de l'évènement",
    });
    setisModalOpen(false);
  };

  return (
    <>
      <PopoverArrow height={10} width={30} fill="white" />
      <div>
        {isEditable ? (
          <form
            className="bg-white rounded"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              zIndex: 40,
              position: "relative",
            }}
            onSubmit={handleSubmit(onSubmit)}
          >
            <fieldset className="p-6 flex flex-col gap-5">
              <div className="flex justify-between">
                <button
                  className="rounded bg-blue-600 justify-center flex gap-2 items-center text-white p-2 cursor-pointer"
                  disabled={isDisable}
                  type="submit"
                >
                  <Pencil1Icon />
                  Enregistrer
                </button>
                {eventInfos.id !== -42 && (
                  <button
                    className="rounded bg-red-600 justify-center flex gap-2 items-center text-white p-2 cursor-pointer"
                    onClick={handleDeleteEvent}
                    type="submit"
                    disabled={isDisable}
                  >
                    <Cross1Icon />
                    Supprimer
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <TextIcon className="w-5 h-5 text-gray-400" />
                <input
                  required
                  className=" text-2xl font-medium border-b-2 border-gray-300 bg-white focus:outline-none	"
                  placeholder="Titre de l'évènement"
                  defaultValue={eventInfos.name}
                  {...register("name")}
                />
              </div>
              <div className="flex gap-3">
                <ClockIcon className="relative top-[14px] w-5 h-5 text-gray-400" />
                <div className=" flex-grow flex flex-col gap-2">
                  <input
                    type="datetime-local"
                    style={{ colorScheme: "grey" }}
                    className="p-2 outline-gray-300 outline rounded bg-white selection:bg-cyan-200"
                    defaultValue={format(
                      eventInfos.parentEventsDate.dateStart,
                      "yyyy-MM-dd'T'HH:mm"
                    )}
                    {...register("dateStart")}
                  />
                  <input
                    type="datetime-local"
                    min={dateStart}
                    style={{ colorScheme: "grey" }}
                    className="p-2 outline-gray-300 outline rounded bg-white"
                    defaultValue={format(
                      eventInfos.parentEventsDate.dateEnd,
                      "yyyy-MM-dd'T'HH:mm"
                    )}
                    {...register("dateEnd")}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 relative">
                <HomeIcon className="w-5 h-5 text-gray-400" />
                <Command
                  className=" flex-grow"
                  {...register("subTag_id")}
                  label="Command Menu"
                  tabIndex={1}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) {
                      setisDisplayRooms(false);
                    }
                  }}
                >
                  <Command.Input
                    required
                    onFocus={() => setisDisplayRooms(true)}
                    onValueChange={(value) => setValue("subTag_id", value)}
                    value={`${subTag_id}`}
                    // defaultValue={roomOptions[eventInfos.subTag_id]}
                    className="p-2 outline-gray-300 outline rounded bg-white w-full"
                  />

                  <Command.List className=" pr-6 z-10 divide-x-2 position absolute max-h-60 w-full overflow-scroll">
                    {isLoading ? (
                      <Command.Loading className="p-2 rounded bg-white">
                        Chargement des salles
                      </Command.Loading>
                    ) : (
                      <>
                        <Command.Empty className="p-2 rounded bg-white">
                          Pas de salles disponibles trouvées
                        </Command.Empty>

                        <Command.Group
                          className={`${
                            isDisplayRooms ? "" : "hidden"
                          } divide-y-2`}
                        >
                          {roomOptions.map((room, index) => {
                            const isConflictedRoomId = !items.some(
                              (item: number) => item === room.id
                            );
                            if (isConflictedRoomId)
                              return (
                                <Command.Item
                                  className={`p-2 rounded bg-white hover:bg-gray-300`}
                                  onSelect={(value) => {
                                    if (isConflictedRoomId) {
                                      setValue("subTag_id", room.name);
                                      setisDisplayRooms(false);
                                    }
                                  }}
                                  value={room.name}
                                  key={index}
                                >
                                  {room.name}
                                </Command.Item>
                              );
                          })}
                        </Command.Group>
                      </>
                    )}
                  </Command.List>
                </Command>
              </div>
              <div className="flex items-center gap-2 relative">
                <TextAlignLeftIcon className="w-5 h-5 text-gray-400" />
                <input
                  className="p-2 outline-gray-300 outline rounded bg-white w-full"
                  placeholder="Ajoutez une description"
                  defaultValue={eventInfos.description}
                  {...register("description")}
                />
              </div>
              {eventInfos.id >= 0 && (
                <div className="flex gap-2 relative">
                  <PersonIcon className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-wrap text-sm">
                      {`Créé par ${eventInfos.user.givenName} ${
                        eventInfos.user.surname
                      } le ${formatInTimeZone(
                        eventInfos.parentEventsDate.createdAt,
                        "Europe/Paris",
                        "dd-MM-yyyy HH:mm",
                        { locale: fr }
                      )}`}
                    </p>
                  </div>
                </div>
              )}
            </fieldset>
          </form>
        ) : (
          <div className=" flex flex-col p-2 gap-3 bg-white rounded focus-visible:outline-none">
            <div className="flex items-center gap-2 text-2xl text-zinc-900">
              {eventInfos.name}
            </div>
            <hr className=" border-zinc-400" />
            {/* <div className="">{eventInfos.description}</div> */}
            <div className=" flex gap-3 items-center border-zinc-400">
              <ClockIcon className="relative w-5 h-5 text-gray-400" />
              <div className=" border-b-[1px] w-full border-zinc-400">
                {formatInTimeZone(
                  eventInfos.dateStart,
                  "Europe/Paris",
                  "EE dd-MM-yyyy HH:mm",
                  { locale: fr }
                )}
                {formatInTimeZone(
                  eventInfos.dateEnd,
                  "Europe/Paris",
                  "-HH:mm",
                  {
                    locale: fr,
                  }
                )}
              </div>
            </div>
            <div className=" flex gap-3 items-center border-zinc-400">
              <HomeIcon className="w-5 h-5 text-gray-400" />
              <div className=" border-b-[1px] border-zinc-400 w-full">
                {
                  roomOptions.find(
                    (item) => item.tag_id === eventInfos.subTag_id
                  )?.name
                }
              </div>
            </div>
            {eventInfos.id >= 0 && (
              <div className="flex gap-2 relative">
                <PersonIcon className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-wrap text-sm">
                    {`${eventInfos.user.givenName} ${
                      eventInfos.user.surname
                    } le ${formatInTimeZone(
                      eventInfos.parentEventsDate.createdAt,
                      "Europe/Paris",
                      "dd-MM-yyyy HH:mm",
                      { locale: fr }
                    )}`}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
