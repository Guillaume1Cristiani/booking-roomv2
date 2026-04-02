export interface Booking {
  title: string;
  status: boolean;
  startTime: string;
  endTime: string;
  owner: string;
  subtag_id: number;
}

export interface Room {
  id: number;
  name: string;
  description: string;
  color: string;
  tag_id: number;
}
