import * as z from "zod/v4";
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
export declare const commentAnnotationSchema: z.ZodObject<
  {
    type: z.ZodLiteral<"comment">;
    html: z.ZodString;
    replyTo: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAtMs: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    updatedAtMs: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    userProfilePicture: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    userName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    tags: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
  },
  z.core.$strip
>;
declare const annotationDataSchema: z.ZodDiscriminatedUnion<
  [
    z.ZodObject<
      {
        type: z.ZodLiteral<"comment">;
        html: z.ZodString;
        replyTo: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        createdAtMs: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        updatedAtMs: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        userProfilePicture: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        userName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        tags: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
      },
      z.core.$strip
    >,
  ],
  "type"
>;
export type AnnotationData = z.infer<typeof annotationDataSchema>;
export type CommentAnnotationData = z.infer<typeof commentAnnotationSchema>;
export type Annotation = z.infer<typeof annotationSchema>;
export declare const annotationSchema: z.ZodObject<
  {
    id: z.ZodString;
    bookId: z.ZodString;
    chapterNumber: z.ZodNumber;
    verseNumber: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    endVerseNumber: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    verseNumbers: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodNumber>>>;
    order: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    data: z.ZodDiscriminatedUnion<
      [
        z.ZodObject<
          {
            type: z.ZodLiteral<"comment">;
            html: z.ZodString;
            replyTo: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            createdAtMs: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            updatedAtMs: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            userProfilePicture: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            userName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            tags: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
          },
          z.core.$strip
        >,
      ],
      "type"
    >;
  },
  z.core.$strip
>;
export declare function createAnnotationsManager(
  os: CasualOSManager,
  login: LoginManager
): AnnotationsManager;
export {};
