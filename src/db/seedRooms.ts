import { Room } from "@/components/Calendar/types/types";
/*
 export enum Rooms {
   "1-11",  #29516D
   "1-5",  #277552
   "Accueil",  #AA5839
   "1-12",  #AA7939
   "2-4",  #4A2D73
   "HUB",  #6D256F
   "1-8",  #93A537
   "1-9",  #AA9F39
   "1-10",  #6D5293
   "1-4",  #4E0C50
   "1-3",  #C1D26C
   "Réfectoire",  #2E1354
   "1-6",  #ADBE58
   "1-7",  #798B1D
 }

# Salles privatisées
 MSC
   "1-11",  #29516D
 PGE
   "1-5",  #277552
   "Accueil",  #AA5839
   "1-12",  #AA7939

# Salles communes
  HUB
  Réfectoire
  BLUE
  ## MSC (GREEN)
    1-8,
    1-9, 
    1-3,
  ## PGE
    1-4
    1-6
    1-7 
  */

export const addRooms: Omit<Room, "id">[] = [
  {
    name: "2-4",
    description: "2-4",
    color: "bg-zinc",
    tag_id: 13,
  },
  {
    name: "2-3",
    description: "2-4",
    color: "bg-sky",
    tag_id: 14,
  },
  {
    name: "2-1",
    description: "2-4",
    color: "bg-fuchsia",
    tag_id: 14,
  },
];

export const seederRooms: Omit<Room, "id">[] = [
  {
    name: "1-11",
    description: "Salle 1-11",
    color: "bg-red",
    tag_id: 1,
  },
  {
    name: "1-5",
    description: "Salle 1-5",
    color: "bg-yellow",
    tag_id: 2,
  },
  {
    name: "Accueil",
    description: "Salle Accueil",
    color: "bg-amber",
    tag_id: 3,
  },
  {
    name: "1-12",
    description: "Salle 1-12",
    color: "bg-orange",
    tag_id: 4,
  },
  {
    name: "Hub",
    description: "Salle HUB",
    color: "bg-blue",
    tag_id: 5,
  },
  // Common Room MSC
  {
    name: "1-8",
    description: "Salle 1-8",
    color: "bg-lime",
    tag_id: 6,
  },
  {
    name: "1-9",
    description: "Salle 1-9",
    color: "bg-green",
    tag_id: 7,
  },
  {
    name: "1-3",
    description: "Salle 1-3",
    color: "bg-emerald",
    tag_id: 8,
  },
  // Common Room PGE
  {
    name: "1-4",
    description: "Salle 1-4",
    color: "bg-violet",
    tag_id: 9,
  },
  {
    name: "1-6",
    description: "Salle 1-6",
    color: "bg-purple",
    tag_id: 10,
  },
  {
    name: "1-7",
    description: "Salle 1-7",
    color: "bg-indigo",
    tag_id: 11,
  },
  {
    name: "Réfectoire",
    description: "Réfectoire",
    color: "bg-pink",
    tag_id: 12,
  },
  {
    name: "2-4",
    description: "2-4",
    color: "bg-zinc",
    tag_id: 13,
  },
  {
    name: "2-3",
    description: "2-3",
    color: "bg-sky",
    tag_id: 14,
  },
  {
    name: "2-1",
    description: "2-1",
    color: "bg-fuchsia",
    tag_id: 15,
  },
];
