import { isAfter } from "date-fns";
import { FormValues } from "../data/events";

export const handlingErrorDates = (data: FormValues): 1 | string => {
  if (isAfter(data.dateStart, data.dateEnd))
    return "La date de début ne peut pas être après la date de fin";
  return 1;
};
