export interface ReadingHistoryTooltipHeaderProps {
  monthName: string;
  dayOfTheMonth: number;
  year: number;
  minutesCount: number;
}

export interface ReadingHistoryTooltipHeaderData extends ReadingHistoryTooltipHeaderProps {
  type: "readingHistoryHeader";
}

export interface ReadingHistoryTooltipContentParams {
  fixedContent: string;
  userName: string;
  dotStyle: React.CSSProperties;
}

export interface ReadingHistoryTooltipContentData extends ReadingHistoryTooltipContentParams {
  type: "readingHistory";
}

export interface UserPresenceTooltipContentParams {
  colors: React.CSSProperties["backgroundColor"][];
  labelText: string;
}

export interface UserPresenceTooltipContentData extends UserPresenceTooltipContentParams {
  type: "userPresence";
}

export interface TextTooltipContentData {
  type: "text";
  content: string;
}

export type TooltipContentData =
  | ReadingHistoryTooltipContentData
  | ReadingHistoryTooltipHeaderData
  | UserPresenceTooltipContentData
  | TextTooltipContentData;
