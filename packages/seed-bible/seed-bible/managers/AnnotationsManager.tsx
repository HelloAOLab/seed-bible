import { z } from "zod";
import type { LoginManager } from "../managers/LoginManager";
import type { CasualOSManager } from "./OsManager";

export interface AnnotationQuery {
  recordName?: string;
  group?: string;
}

export interface AnnotationsManager {
  saveAnnotation: (
    annotation: Annotation,
    query?: AnnotationQuery
  ) => Promise<Annotation>;
  deleteAnnotation: (
    annotationId: string,
    query?: AnnotationQuery
  ) => Promise<void>;
  listAnnotationsForChapter: (
    bookId: string,
    chapterNumber: number,
    query?: AnnotationQuery
  ) => Promise<Annotation[]>;
}

export const commentAnnotationSchema = z.object({
  type: z.literal("comment"),
  html: z.string(),
  replyTo: z.string().nullable().optional(),
  createdAtMs: z.number().nullable().optional(),
  updatedAtMs: z.number().nullable().optional(),
  userProfilePicture: z.string().nullable().optional(),
  userName: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
});

const annotationDataSchema = z.discriminatedUnion("type", [
  commentAnnotationSchema,
]);

export type AnnotationData = z.infer<typeof annotationDataSchema>;
export type CommentAnnotationData = z.infer<typeof commentAnnotationSchema>;
export type Annotation = z.infer<typeof annotationSchema>;

export const annotationSchema = z.object({
  id: z.string().min(1),
  bookId: z.string().min(1),
  chapterNumber: z.number().int().positive(),
  verseNumber: z.number().int().positive().nullable().optional(),
  endVerseNumber: z.number().int().positive().nullable().optional(),
  verseNumbers: z.array(z.number().int().positive()).nullable().optional(),
  order: z.number().nullable().optional(),
  data: annotationDataSchema,
});

function getAnnotationMarker(
  bookId: string,
  chapterNumber: number,
  group: string = "annotations"
): string {
  return `publicRead:${group}/${bookId}/${chapterNumber}`;
}

function sortAnnotations(annotations: Annotation[]): Annotation[] {
  return [...annotations].sort((a, b) => {
    if (typeof a.order === "number") {
      if (typeof b.order === "number") {
        return a.order - b.order;
      }
      return -1;
    }

    if (typeof b.order === "number") {
      return 1;
    }

    return a.id < b.id ? -1 : 1;
  });
}

export function createAnnotationsManager(
  os: CasualOSManager,
  login: LoginManager
): AnnotationsManager {
  const resolveRecordName = async (recordName?: string): Promise<string> => {
    if (recordName) {
      return recordName;
    }

    if (!login.userId.value) {
      await login.login();
    }

    const userId = login.userId.value;
    if (!userId) {
      throw new Error(
        "Unable to resolve annotation record. User is not authenticated."
      );
    }

    return userId;
  };

  const saveAnnotation = async (
    annotation: Annotation,
    query?: AnnotationQuery
  ): Promise<Annotation> => {
    const parsed = annotationSchema.parse(annotation);
    const recordName = await resolveRecordName(query?.recordName);
    const marker = getAnnotationMarker(
      parsed.bookId,
      parsed.chapterNumber,
      query?.group
    );

    const result = await os.recordData(recordName, parsed.id, parsed, {
      marker,
    });

    if (!result.success) {
      console.error("Error saving annotation:", result);
      throw new Error(`Error saving annotation: ${result.errorCode}`);
    }

    return parsed;
  };

  const deleteAnnotation = async (
    annotationId: string,
    query?: AnnotationQuery
  ): Promise<void> => {
    const recordName = await resolveRecordName(query?.recordName);
    const result = await os.eraseData(recordName, annotationId);

    if (!result.success) {
      console.error("Error deleting annotation:", result);
      throw new Error(`Error deleting annotation: ${result.errorCode}`);
    }
  };

  const listAnnotationsForChapter = async (
    bookId: string,
    chapterNumber: number,
    query?: AnnotationQuery
  ): Promise<Annotation[]> => {
    const recordName = await resolveRecordName(query?.recordName);
    const marker = getAnnotationMarker(bookId, chapterNumber, query?.group);

    const annotations: Annotation[] = [];
    let lastAddress: string | undefined;

    while (true) {
      const page = await os.listDataByMarker(recordName, marker, lastAddress);

      if (!page.success) {
        console.error("Error listing annotations:", page);
        throw new Error(`Error listing annotations: ${page.errorCode}`);
      }

      if (page.items.length === 0) {
        break;
      }

      for (const item of page.items) {
        const parsed = annotationSchema.safeParse(item.data);
        if (!parsed.success) {
          console.warn("Skipping invalid annotation record:", parsed.error);
          continue;
        }
        annotations.push(parsed.data);
      }

      lastAddress = page.items[page.items.length - 1]?.address;
    }

    return sortAnnotations(annotations);
  };

  return {
    saveAnnotation,
    deleteAnnotation,
    listAnnotationsForChapter,
  };
}
