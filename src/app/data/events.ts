import { CSSProperties } from "react";

export interface Events {
  id: number;
  name: string;
  description: string;
  dateStart: string;
  dateEnd: string;
  subTag_id: number;
  createdAt: string;
  updatedAt: string;
}

export interface ValidatedEvents extends Events {
  microsoft_id: string;
}

export interface OverlaysEvent {
  infos: Events;
  startElement: number;
  endElement: number;
  defaultOpen?: boolean;
  style: EventCSSProperties;
}

export type FormValues = {
  id?: number;
  name: string;
  description: string;
  dateStart: string;
  dateEnd: string;
  subTag_id: Number | string;
  microsoft_id: string;
};

export interface EventCSSProperties extends CSSProperties {
  top: string;
  height: string;
  position: "absolute";
  zIndex: number | string;
  backgroundColor: string;
  borderRadius: string;
  cursor: "pointer";
  wordBreak: "break-all";
  borderLeft: string;
  borderLeftWidth: string;
  paddingLeft: string;
  paddingRight: string;
  overflow: "hidden";
  fontSize: string;
  lineHeight: string;
}
