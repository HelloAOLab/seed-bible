import type { SharedDocument } from "@casual-simulation/aux-common/documents/SharedDocument";
import { createRecordsClient } from "@casual-simulation/aux-records/RecordsClient";
import type { RecordFileFailure } from "@casual-simulation/aux-records";
import type { SessionInvalidatedEvent } from "./SessionGuard";
export type CasualOSManager = ReturnType<typeof CasualOSManager>;
export type {
  FatalSessionErrorCode,
  SessionInvalidatedEvent,
} from "./SessionGuard";
export { FATAL_SESSION_ERROR_CODES } from "./SessionGuard";
export interface UserInfo {
  id: string;
  email: string;
}
export declare function CasualOSManager(endpoint?: string): {
  client: import("@casual-simulation/aux-records/RecordsClient").RecordsClient &
    import("@casual-simulation/aux-common").RemoteProcedures<{
      playerIndex: import("@casual-simulation/aux-common").Procedure<
        void,
        import("@casual-simulation/aux-common").GenericResult<
          import("@casual-simulation/aux-records/ViewTemplateRenderer").ViewParams,
          import("@casual-simulation/aux-common").SimpleError
        >,
        void
      >;
      playerVmIframe: import("@casual-simulation/aux-common").Procedure<
        void,
        import("@casual-simulation/aux-common").GenericResult<
          import("@casual-simulation/aux-records/ViewTemplateRenderer").ViewParams,
          import("@casual-simulation/aux-common").SimpleError
        >,
        void
      >;
      playerVmIframeDom: import("@casual-simulation/aux-common").Procedure<
        void,
        import("@casual-simulation/aux-common").GenericResult<
          import("@casual-simulation/aux-records/ViewTemplateRenderer").ViewParams,
          import("@casual-simulation/aux-common").SimpleError
        >,
        void
      >;
      authIndex: import("@casual-simulation/aux-common").Procedure<
        void,
        import("@casual-simulation/aux-common").GenericResult<
          import("@casual-simulation/aux-records/ViewTemplateRenderer").ViewParams,
          import("@casual-simulation/aux-common").SimpleError
        >,
        void
      >;
      authIframe: import("@casual-simulation/aux-common").Procedure<
        void,
        import("@casual-simulation/aux-common").GenericResult<
          import("@casual-simulation/aux-records/ViewTemplateRenderer").ViewParams,
          import("@casual-simulation/aux-common").SimpleError
        >,
        void
      >;
      getUserInfo: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            userId: import("zod").ZodString;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").GetUserInfoFailure
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          }
        | {
            readonly success: true;
            readonly name: string;
            readonly avatarUrl: string;
            readonly avatarPortraitUrl: string;
            readonly email: string;
            readonly phoneNumber: string;
            readonly hasActiveSubscription: boolean;
            readonly subscriptionTier: string;
            readonly privacyFeatures: import("@casual-simulation/aux-common").PrivacyFeatures;
            readonly displayName: string;
            readonly role: import("@casual-simulation/aux-common").UserRole;
            readonly contractFeatures: {
              allowed: boolean;
              currencyLimits: {
                [x: string]: {
                  maxCost: number;
                  minCost: number;
                  fee?:
                    | {
                        type: "percent";
                        percent: number;
                      }
                    | {
                        type: "fixed";
                        amount: number;
                      };
                };
              };
              maxItems?: number;
            };
            readonly stripeAccountId: string;
            readonly stripeAccountStatus: import("@casual-simulation/aux-records").StripeAccountStatus;
            readonly stripeAccountRequirementsStatus: import("@casual-simulation/aux-records").StripeRequirementsStatus;
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      isEmailValid: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            email: import("zod").ZodString;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records").IsValidEmailAddressResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      isDisplayNameValid: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            displayName: import("zod").ZodString;
            name: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records").IsValidDisplayNameResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      createAccount: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<{}, import("zod/v4/core").$strip>,
        | import("@casual-simulation/aux-records").CreateAccountResult
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      listSessions: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodPrefault<
          import("zod").ZodObject<
            {
              expireTimeMs: import("zod").ZodNullable<
                import("zod").ZodOptional<
                  import("zod").ZodCoercedNumber<unknown>
                >
              >;
              userId: import("zod").ZodNullable<
                import("zod").ZodOptional<import("zod").ZodString>
              >;
            },
            import("zod/v4/core").$strip
          >
        >,
        | import("@casual-simulation/aux-records").ListSessionsResult
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      replaceSession: import("@casual-simulation/aux-common").Procedure<
        void,
        | import("@casual-simulation/aux-records").ReplaceSessionResult
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          },
        void
      >;
      revokeAllSessions: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            userId: import("zod").ZodString;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").RevokeAllSessionsResult
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      revokeSession: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            userId: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            sessionId: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            sessionKey: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").RevokeSessionResult
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      completeLogin: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            userId: import("zod").ZodString;
            requestId: import("zod").ZodString;
            code: import("zod").ZodString;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records").CompleteLoginResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      requestLogin: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            address: import("zod").ZodString;
            addressType: import("zod").ZodEnum<{
              email: "email";
              phone: "phone";
            }>;
            loginStudioId: import("zod").ZodOptional<
              import("zod").ZodNullable<import("zod").ZodString>
            >;
            comId: import("zod").ZodOptional<
              import("zod").ZodNullable<import("zod").ZodString>
            >;
            customDomain: import("zod").ZodOptional<
              import("zod").ZodNullable<import("zod").ZodString>
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records").LoginRequestResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      requestPrivoLogin: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<{}, import("zod/v4/core").$strip>,
        import("@casual-simulation/aux-records").OpenIDLoginRequestResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      processOAuthCode: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            code: import("zod").ZodString;
            state: import("zod").ZodString;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records").ProcessOpenIDAuthorizationCodeResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      completeOAuthLogin: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            requestId: import("zod").ZodString;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records").CompleteOpenIDLoginResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      requestPrivoSignUp: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            email: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodEmail>
            >;
            parentEmail: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodEmail>
            >;
            name: import("zod").ZodString;
            dateOfBirth: import("zod").ZodCoercedDate<unknown>;
            displayName: import("zod").ZodString;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records").PrivoSignUpRequestResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      requestPrivacyFeaturesChange: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            userId: import("zod").ZodString;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records").RequestPrivacyFeaturesChangeResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      getWebAuthnRegistrationOptions: import("@casual-simulation/aux-common").Procedure<
        void,
        | import("@casual-simulation/aux-records").RequestWebAuthnRegistrationResult
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure,
        void
      >;
      registerWebAuthn: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            response: import("zod").ZodObject<
              {
                id: import("zod").ZodString;
                rawId: import("zod").ZodString;
                response: import("zod").ZodObject<
                  {
                    clientDataJSON: import("zod").ZodString;
                    attestationObject: import("zod").ZodString;
                    authenticatorData: import("zod").ZodNullable<
                      import("zod").ZodOptional<import("zod").ZodString>
                    >;
                    transports: import("zod").ZodNullable<
                      import("zod").ZodOptional<
                        import("zod").ZodArray<import("zod").ZodString>
                      >
                    >;
                    publicKeyAlgorithm: import("zod").ZodNullable<
                      import("zod").ZodOptional<import("zod").ZodNumber>
                    >;
                    publicKey: import("zod").ZodNullable<
                      import("zod").ZodOptional<import("zod").ZodString>
                    >;
                  },
                  import("zod/v4/core").$strip
                >;
                authenticatorAttachment: import("zod").ZodNullable<
                  import("zod").ZodOptional<
                    import("zod").ZodEnum<{
                      "cross-platform": "cross-platform";
                      platform: "platform";
                    }>
                  >
                >;
                clientExtensionResults: import("zod").ZodObject<
                  {
                    appid: import("zod").ZodNullable<
                      import("zod").ZodOptional<import("zod").ZodBoolean>
                    >;
                    credProps: import("zod").ZodNullable<
                      import("zod").ZodOptional<
                        import("zod").ZodObject<
                          {
                            rk: import("zod").ZodNullable<
                              import("zod").ZodOptional<
                                import("zod").ZodBoolean
                              >
                            >;
                          },
                          import("zod/v4/core").$strip
                        >
                      >
                    >;
                    hmacCreateSecret: import("zod").ZodNullable<
                      import("zod").ZodOptional<import("zod").ZodBoolean>
                    >;
                  },
                  import("zod/v4/core").$strip
                >;
                type: import("zod").ZodLiteral<"public-key">;
              },
              import("zod/v4/core").$strip
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").CompleteWebAuthnRegistrationResult
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      getWebAuthnLoginOptions: import("@casual-simulation/aux-common").Procedure<
        void,
        import("@casual-simulation/aux-records").RequestWebAuthnLoginResult,
        void
      >;
      completeWebAuthnLogin: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            requestId: import("zod").ZodString;
            response: import("zod").ZodObject<
              {
                id: import("zod").ZodString;
                rawId: import("zod").ZodString;
                response: import("zod").ZodObject<
                  {
                    clientDataJSON: import("zod").ZodString;
                    authenticatorData: import("zod").ZodString;
                    signature: import("zod").ZodString;
                    userHandle: import("zod").ZodNullable<
                      import("zod").ZodOptional<import("zod").ZodString>
                    >;
                  },
                  import("zod/v4/core").$strip
                >;
                authenticatorAttachment: import("zod").ZodNullable<
                  import("zod").ZodOptional<
                    import("zod").ZodEnum<{
                      "cross-platform": "cross-platform";
                      platform: "platform";
                    }>
                  >
                >;
                clientExtensionResults: import("zod").ZodObject<
                  {
                    appid: import("zod").ZodNullable<
                      import("zod").ZodOptional<import("zod").ZodBoolean>
                    >;
                    credProps: import("zod").ZodNullable<
                      import("zod").ZodOptional<
                        import("zod").ZodObject<
                          {
                            rk: import("zod").ZodNullable<
                              import("zod").ZodOptional<
                                import("zod").ZodBoolean
                              >
                            >;
                          },
                          import("zod/v4/core").$strip
                        >
                      >
                    >;
                    hmacCreateSecret: import("zod").ZodNullable<
                      import("zod").ZodOptional<import("zod").ZodBoolean>
                    >;
                  },
                  import("zod/v4/core").$strip
                >;
                type: import("zod").ZodLiteral<"public-key">;
              },
              import("zod/v4/core").$strip
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records").CompleteWebAuthnLoginResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      listUserAuthenticators: import("@casual-simulation/aux-common").Procedure<
        void,
        | import("@casual-simulation/aux-records").ListUserAuthenticatorsResult
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure,
        void
      >;
      deleteUserAuthenticator: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            authenticatorId: import("zod").ZodString;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").DeleteUserAuthenticatorResult
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      createMeetToken: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            roomName: import("zod").ZodString;
            userName: import("zod").ZodString;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records").IssueMeetTokenResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      createRecord: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            ownerId: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            studioId: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").CreateRecordResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      addEventCount: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordKey: import("zod").ZodString;
            eventName: import("zod").ZodString;
            count: import("zod").ZodNumber;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").AddCountResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      getEventCount: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            eventName: import("zod").ZodString;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").GetCountResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      listEvents: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            eventName: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").ListEventsResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      updateEvent: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordKey: import("zod").ZodString;
            eventName: import("zod").ZodString;
            count: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodNumber>
            >;
            markers: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").UpdateEventRecordResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      deleteManualData: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordKey: import("zod").ZodString;
            address: import("zod").ZodString;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").EraseDataSuccess
        | import("@casual-simulation/aux-records").EraseDataFailure
        | {
            readonly success: false;
            readonly errorCode: "unacceptable_request";
            readonly errorMessage: "recordKey is required and must be a string.";
          }
        | {
            readonly success: false;
            readonly errorCode: "unacceptable_request";
            readonly errorMessage: "address is required and must be a string.";
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      getManualData: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodString;
            instances: import("zod").ZodOptional<
              import("zod").ZodPipe<
                import("zod").ZodTransform<unknown, unknown>,
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").GetDataSuccess
        | import("@casual-simulation/aux-records").GetDataFailure
        | {
            readonly success: false;
            readonly errorCode: "unacceptable_request";
            readonly errorMessage: "recordName is required and must be a string.";
          }
        | {
            readonly success: false;
            readonly errorCode: "unacceptable_request";
            readonly errorMessage: "address is required and must be a string.";
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      recordManualData: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordKey: import("zod").ZodString;
            address: import("zod").ZodString;
            data: import("zod").ZodAny;
            updatePolicy: import("zod").ZodOptional<
              import("zod").ZodUnion<
                readonly [
                  import("zod").ZodLiteral<true>,
                  import("zod").ZodArray<import("zod").ZodString>,
                ]
              >
            >;
            deletePolicy: import("zod").ZodOptional<
              import("zod").ZodUnion<
                readonly [
                  import("zod").ZodLiteral<true>,
                  import("zod").ZodArray<import("zod").ZodString>,
                ]
              >
            >;
            markers: import("zod").ZodOptional<
              import("zod").ZodArray<import("zod").ZodString>
            >;
            instances: import("zod").ZodOptional<
              import("zod").ZodPipe<
                import("zod").ZodTransform<unknown, unknown>,
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").RecordDataSuccess
        | import("@casual-simulation/aux-records").RecordDataFailure
        | {
            readonly success: false;
            readonly errorCode: "unacceptable_request";
            readonly errorMessage: "recordKey is required and must be a string.";
          }
        | {
            readonly success: false;
            readonly errorCode: "unacceptable_request";
            readonly errorMessage: "address is required and must be a string.";
          }
        | {
            readonly success: false;
            readonly errorCode: "unacceptable_request";
            readonly errorMessage: "data is required.";
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      getFile: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodOptional<import("zod").ZodString>;
            fileName: import("zod").ZodOptional<import("zod").ZodString>;
            fileUrl: import("zod").ZodOptional<import("zod").ZodString>;
            instances: import("zod").ZodOptional<
              import("zod").ZodPipe<
                import("zod").ZodTransform<unknown, unknown>,
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").GetFileNameFromUrlFailure
        | import("@casual-simulation/aux-records").ReadFileSuccess
        | import("@casual-simulation/aux-records").ReadFileFailure
        | {
            readonly success: false;
            readonly errorCode: "unacceptable_request";
            readonly errorMessage: string;
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      listFiles: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            fileName: import("zod").ZodOptional<import("zod").ZodString>;
            instances: import("zod").ZodOptional<
              import("zod").ZodPipe<
                import("zod").ZodTransform<unknown, unknown>,
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").ListFilesSuccess
        | import("@casual-simulation/aux-records").ListFilesFailure
        | {
            readonly success: false;
            readonly errorCode: "unacceptable_request";
            readonly errorMessage: "recordName must be a string.";
          }
        | {
            readonly success: false;
            readonly errorCode: "unacceptable_request";
            readonly errorMessage: "fileName must be a string.";
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      eraseFile: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordKey: import("zod").ZodString;
            fileUrl: import("zod").ZodString;
            instances: import("zod").ZodOptional<
              import("zod").ZodPipe<
                import("zod").ZodTransform<unknown, unknown>,
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").GetFileNameFromUrlSuccess
        | import("@casual-simulation/aux-records").GetFileNameFromUrlFailure
        | import("@casual-simulation/aux-records").EraseFileFailure
        | {
            readonly success: false;
            readonly errorCode: "unacceptable_request";
            readonly errorMessage: "recordKey is required and must be a string.";
          }
        | {
            readonly success: false;
            readonly errorCode: "unacceptable_request";
            readonly errorMessage: "fileUrl is required and must be a string.";
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      recordFile: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordKey: import("zod").ZodString;
            fileSha256Hex: import("zod").ZodString;
            fileByteLength: import("zod").ZodInt;
            fileMimeType: import("zod").ZodOptional<import("zod").ZodString>;
            fileExtension: import("zod").ZodOptional<import("zod").ZodString>;
            fileDescription: import("zod").ZodOptional<import("zod").ZodString>;
            markers: import("zod").ZodOptional<
              import("zod").ZodArray<import("zod").ZodString>
            >;
            instances: import("zod").ZodOptional<
              import("zod").ZodPipe<
                import("zod").ZodTransform<unknown, unknown>,
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").RecordFileSuccess
        | import("@casual-simulation/aux-records/FileRecordsController").RecordFileFailure
        | {
            readonly success: false;
            readonly errorCode: "unacceptable_request";
            readonly errorMessage: "recordKey is required and must be a string.";
          }
        | {
            readonly success: false;
            readonly errorCode: "unacceptable_request";
            readonly errorMessage: "fileSha256Hex is required and must be a string.";
          }
        | {
            readonly success: false;
            readonly errorCode: "unacceptable_request";
            readonly errorMessage: "fileByteLength is required and must be a number.";
          }
        | {
            readonly success: false;
            readonly errorCode: "unacceptable_request";
            readonly errorMessage: "Either fileMimeType or fileExtension is required.";
          }
        | {
            readonly success: false;
            readonly errorCode: "unacceptable_request";
            readonly errorMessage: "fileDescription must be a string.";
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      updateFile: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordKey: import("zod").ZodString;
            fileUrl: import("zod").ZodString;
            markers: import("zod").ZodArray<import("zod").ZodString>;
            instances: import("zod").ZodOptional<
              import("zod").ZodPipe<
                import("zod").ZodTransform<unknown, unknown>,
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").GetFileNameFromUrlFailure
        | import("@casual-simulation/aux-records").UpdateFileRecordSuccess
        | import("@casual-simulation/aux-records").UpdateFileRecordFailure,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      scanFileForModeration: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            fileName: import("zod").ZodString;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").ScanFileSuccess
        | import("@casual-simulation/aux-records").ScanFileFailure
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          }
        | {
            readonly success: false;
            readonly errorCode: "not_authorized";
            readonly errorMessage: "You are not authorized to perform this action.";
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      scheduleModerationScans: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<{}, import("zod/v4/core").$strip>,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").ScheduleModerationScansSuccess
        | import("@casual-simulation/aux-records").ScheduleModerationScansFailure
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          }
        | {
            readonly success: false;
            readonly errorCode: "not_authorized";
            readonly errorMessage: "You are not authorized to perform this action.";
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      eraseData: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordKey: import("zod").ZodString;
            address: import("zod").ZodString;
            instances: import("zod").ZodOptional<
              import("zod").ZodPipe<
                import("zod").ZodTransform<unknown, unknown>,
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").EraseDataSuccess
        | import("@casual-simulation/aux-records").EraseDataFailure
        | {
            readonly success: false;
            readonly errorCode: "unacceptable_request";
            readonly errorMessage: "recordKey is required and must be a string.";
          }
        | {
            readonly success: false;
            readonly errorCode: "unacceptable_request";
            readonly errorMessage: "address is required and must be a string.";
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      getData: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodString;
            instances: import("zod").ZodOptional<
              import("zod").ZodPipe<
                import("zod").ZodTransform<unknown, unknown>,
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").GetDataSuccess
        | import("@casual-simulation/aux-records").GetDataFailure
        | {
            readonly success: false;
            readonly errorCode: "unacceptable_request";
            readonly errorMessage: "recordName is required and must be a string.";
          }
        | {
            readonly success: false;
            readonly errorCode: "unacceptable_request";
            readonly errorMessage: "address is required and must be a string.";
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      listData: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodOptional<
              import("zod").ZodNullable<import("zod").ZodString>
            >;
            marker: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            sort: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodEnum<{
                  ascending: "ascending";
                  descending: "descending";
                }>
              >
            >;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").ListDataSuccess
        | import("@casual-simulation/aux-records").ListDataFailure
        | {
            readonly success: false;
            readonly errorCode: "unacceptable_request";
            readonly errorMessage: "recordName is required and must be a string.";
          }
        | {
            readonly success: false;
            readonly errorCode: "unacceptable_request";
            readonly errorMessage: "address must be null or a string.";
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      recordData: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordKey: import("zod").ZodString;
            address: import("zod").ZodString;
            data: import("zod").ZodAny;
            updatePolicy: import("zod").ZodOptional<
              import("zod").ZodUnion<
                readonly [
                  import("zod").ZodLiteral<true>,
                  import("zod").ZodArray<import("zod").ZodString>,
                ]
              >
            >;
            deletePolicy: import("zod").ZodOptional<
              import("zod").ZodUnion<
                readonly [
                  import("zod").ZodLiteral<true>,
                  import("zod").ZodArray<import("zod").ZodString>,
                ]
              >
            >;
            markers: import("zod").ZodOptional<
              import("zod").ZodArray<import("zod").ZodString>
            >;
            instances: import("zod").ZodOptional<
              import("zod").ZodPipe<
                import("zod").ZodTransform<unknown, unknown>,
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").RecordDataSuccess
        | import("@casual-simulation/aux-records").RecordDataFailure
        | {
            readonly success: false;
            readonly errorCode: "unacceptable_request";
            readonly errorMessage: "recordKey is required and must be a string.";
          }
        | {
            readonly success: false;
            readonly errorCode: "unacceptable_request";
            readonly errorMessage: "address is required and must be a string.";
          }
        | {
            readonly success: false;
            readonly errorCode: "unacceptable_request";
            readonly errorMessage: "data is required.";
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      recordWebhook: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            item: import("zod").ZodNonOptional<
              import("zod").ZodDiscriminatedUnion<
                [
                  import("zod").ZodObject<
                    {
                      address: import("zod").ZodString;
                      targetResourceKind: import("zod").ZodEnum<{
                        data: "data";
                        file: "file";
                      }>;
                      targetRecordName: import("zod").ZodString;
                      targetAddress: import("zod").ZodString;
                      markers: import("zod").ZodPrefault<
                        import("zod").ZodNullable<
                          import("zod").ZodOptional<
                            import("zod").ZodArray<import("zod").ZodString>
                          >
                        >
                      >;
                    },
                    import("zod/v4/core").$strip
                  >,
                  import("zod").ZodObject<
                    {
                      address: import("zod").ZodString;
                      targetResourceKind: import("zod").ZodLiteral<"inst">;
                      targetRecordName: import("zod").ZodNullable<
                        import("zod").ZodNullable<
                          import("zod").ZodOptional<import("zod").ZodString>
                        >
                      >;
                      targetAddress: import("zod").ZodString;
                      markers: import("zod").ZodPrefault<
                        import("zod").ZodNullable<
                          import("zod").ZodOptional<
                            import("zod").ZodArray<import("zod").ZodString>
                          >
                        >
                      >;
                    },
                    import("zod/v4/core").$strip
                  >,
                ],
                "targetResourceKind"
              >
            >;
            instances: import("zod").ZodOptional<
              import("zod").ZodPipe<
                import("zod").ZodTransform<unknown, unknown>,
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records/crud").CrudRecordItemResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      getWebhook: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodString;
            instances: import("zod").ZodOptional<
              import("zod").ZodPipe<
                import("zod").ZodTransform<unknown, unknown>,
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records/crud").CrudGetItemResult<any>,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      listWebhooks: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodOptional<
              import("zod").ZodNullable<import("zod").ZodString>
            >;
            marker: import("zod").ZodOptional<import("zod").ZodString>;
            sort: import("zod").ZodOptional<
              import("zod").ZodEnum<{
                ascending: "ascending";
                descending: "descending";
              }>
            >;
            instances: import("zod").ZodOptional<
              import("zod").ZodPipe<
                import("zod").ZodTransform<unknown, unknown>,
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records/crud").CrudListItemsFailure
        | import("@casual-simulation/aux-records/crud").CrudListItemsSuccess<any>
        | {
            success: false;
            errorCode: "not_supported";
            errorMessage: string;
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      runWebhook: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodAny,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").HandleWebhookFailure
        | {
            success: true;
            response: import("@casual-simulation/aux-common").GenericHttpResponse;
          },
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodString;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$catchall<
            import("zod").ZodUnion<
              readonly [
                import("zod").ZodString,
                import("zod").ZodArray<import("zod").ZodString>,
              ]
            >
          >
        >
      >;
      eraseWebhook: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodString;
            instances: import("zod").ZodOptional<
              import("zod").ZodPipe<
                import("zod").ZodTransform<unknown, unknown>,
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records/crud").CrudEraseItemResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      listWebhookRuns: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodString;
            requestTimeMs: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodInt>
            >;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records/crud").CrudListItemsFailure
        | import("@casual-simulation/aux-records/crud").CrudListItemsSuccess<
            import("@casual-simulation/aux-records").WebhookRunInfo
          >
        | {
            success: false;
            errorCode: "not_supported";
            errorMessage: string;
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      getWebhookRun: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            runId: import("zod").ZodString;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").GetWebhookRunSuccess
        | import("@casual-simulation/aux-records").GetWebhookRunFailure
        | {
            success: false;
            errorCode: "not_supported";
            errorMessage: string;
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      recordNotification: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            item: import("zod").ZodNonOptional<
              import("zod").ZodObject<
                {
                  address: import("zod").ZodString;
                  description: import("zod").ZodString;
                  markers: import("zod").ZodPrefault<
                    import("zod").ZodNullable<
                      import("zod").ZodOptional<
                        import("zod").ZodArray<import("zod").ZodString>
                      >
                    >
                  >;
                },
                import("zod/v4/core").$strip
              >
            >;
            instances: import("zod").ZodOptional<
              import("zod").ZodPipe<
                import("zod").ZodTransform<unknown, unknown>,
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records/crud").CrudRecordItemResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      getNotification: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodString;
            instances: import("zod").ZodOptional<
              import("zod").ZodPipe<
                import("zod").ZodTransform<unknown, unknown>,
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records/crud").CrudGetItemResult<any>,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      listNotifications: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodOptional<
              import("zod").ZodNullable<import("zod").ZodString>
            >;
            marker: import("zod").ZodOptional<import("zod").ZodString>;
            sort: import("zod").ZodOptional<
              import("zod").ZodEnum<{
                ascending: "ascending";
                descending: "descending";
              }>
            >;
            instances: import("zod").ZodOptional<
              import("zod").ZodPipe<
                import("zod").ZodTransform<unknown, unknown>,
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records/crud").CrudListItemsFailure
        | import("@casual-simulation/aux-records/crud").CrudListItemsSuccess<any>
        | {
            success: false;
            errorCode: "not_supported";
            errorMessage: string;
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      listNotificationSubscriptions: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodString;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records").ListSubscriptionsResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      listUserNotificationSubscriptions: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records").ListSubscriptionsResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      eraseNotification: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodString;
            instances: import("zod").ZodOptional<
              import("zod").ZodPipe<
                import("zod").ZodTransform<unknown, unknown>,
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records/crud").CrudEraseItemResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      registerPushSubscription: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            pushSubscription: import("zod").ZodObject<
              {
                endpoint: import("zod").ZodString;
                expirationTime: import("zod").ZodNullable<
                  import("zod").ZodOptional<import("zod").ZodNumber>
                >;
                keys: import("zod").ZodRecord<
                  import("zod").ZodString,
                  import("zod").ZodString
                >;
              },
              import("zod/v4/core").$strip
            >;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records").RegisterPushSubscriptionResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      subscribeToNotification: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodString;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
            pushSubscription: import("zod").ZodObject<
              {
                endpoint: import("zod").ZodString;
                expirationTime: import("zod").ZodNullable<
                  import("zod").ZodOptional<import("zod").ZodNumber>
                >;
                keys: import("zod").ZodRecord<
                  import("zod").ZodString,
                  import("zod").ZodString
                >;
              },
              import("zod/v4/core").$strip
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records").SubscribeToNotificationResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      unsubscribeFromNotification: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            subscriptionId: import("zod").ZodString;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records").UnsubscribeToNotificationResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      sendNotification: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodString;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
            payload: import("zod").ZodObject<
              {
                title: import("zod").ZodString;
                body: import("zod").ZodString;
                icon: import("zod").ZodNullable<
                  import("zod").ZodOptional<import("zod").ZodString>
                >;
                badge: import("zod").ZodNullable<
                  import("zod").ZodOptional<import("zod").ZodString>
                >;
                silent: import("zod").ZodNullable<
                  import("zod").ZodOptional<import("zod").ZodBoolean>
                >;
                tag: import("zod").ZodNullable<
                  import("zod").ZodOptional<import("zod").ZodString>
                >;
                timestamp: import("zod").ZodNullable<
                  import("zod").ZodOptional<import("zod").ZodNumber>
                >;
                action: import("zod").ZodNullable<
                  import("zod").ZodOptional<
                    import("zod").ZodDiscriminatedUnion<
                      [
                        import("zod").ZodObject<
                          {
                            type: import("zod").ZodLiteral<"open_url">;
                            url: import("zod").ZodString;
                          },
                          import("zod/v4/core").$strip
                        >,
                        import("zod").ZodObject<
                          {
                            type: import("zod").ZodLiteral<"webhook">;
                            method: import("zod").ZodEnum<{
                              GET: "GET";
                              POST: "POST";
                            }>;
                            url: import("zod").ZodString;
                            headers: import("zod").ZodNullable<
                              import("zod").ZodOptional<
                                import("zod").ZodRecord<
                                  import("zod").ZodString,
                                  import("zod").ZodString
                                >
                              >
                            >;
                          },
                          import("zod/v4/core").$strip
                        >,
                      ],
                      "type"
                    >
                  >
                >;
                actions: import("zod").ZodNullable<
                  import("zod").ZodOptional<
                    import("zod").ZodArray<
                      import("zod").ZodObject<
                        {
                          title: import("zod").ZodString;
                          icon: import("zod").ZodNullable<
                            import("zod").ZodOptional<import("zod").ZodString>
                          >;
                          action: import("zod").ZodDiscriminatedUnion<
                            [
                              import("zod").ZodObject<
                                {
                                  type: import("zod").ZodLiteral<"open_url">;
                                  url: import("zod").ZodString;
                                },
                                import("zod/v4/core").$strip
                              >,
                              import("zod").ZodObject<
                                {
                                  type: import("zod").ZodLiteral<"webhook">;
                                  method: import("zod").ZodEnum<{
                                    GET: "GET";
                                    POST: "POST";
                                  }>;
                                  url: import("zod").ZodString;
                                  headers: import("zod").ZodNullable<
                                    import("zod").ZodOptional<
                                      import("zod").ZodRecord<
                                        import("zod").ZodString,
                                        import("zod").ZodString
                                      >
                                    >
                                  >;
                                },
                                import("zod/v4/core").$strip
                              >,
                            ],
                            "type"
                          >;
                        },
                        import("zod/v4/core").$strip
                      >
                    >
                  >
                >;
              },
              import("zod/v4/core").$strip
            >;
            topic: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records").SendNotificationResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      getNotificationsApplicationServerKey: import("@casual-simulation/aux-common").Procedure<
        void,
        import("@casual-simulation/aux-records").GetApplicationServerKeyResult,
        void
      >;
      getPackage: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodString;
            instances: import("zod").ZodOptional<
              import("zod").ZodPipe<
                import("zod").ZodTransform<unknown, unknown>,
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records/crud").CrudGetItemResult<any>,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      recordPackage: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            item: import("zod").ZodNonOptional<
              import("zod").ZodObject<
                {
                  address: import("zod").ZodString;
                  markers: import("zod").ZodArray<import("zod").ZodString>;
                },
                import("zod/v4/core").$strip
              >
            >;
            instances: import("zod").ZodOptional<
              import("zod").ZodPipe<
                import("zod").ZodTransform<unknown, unknown>,
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records/crud").CrudRecordItemResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      erasePackage: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodString;
            instances: import("zod").ZodOptional<
              import("zod").ZodPipe<
                import("zod").ZodTransform<unknown, unknown>,
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records/crud").CrudEraseItemResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      listPackages: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodOptional<
              import("zod").ZodNullable<import("zod").ZodString>
            >;
            marker: import("zod").ZodOptional<import("zod").ZodString>;
            sort: import("zod").ZodOptional<
              import("zod").ZodEnum<{
                ascending: "ascending";
                descending: "descending";
              }>
            >;
            instances: import("zod").ZodOptional<
              import("zod").ZodPipe<
                import("zod").ZodTransform<unknown, unknown>,
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records/crud").CrudListItemsFailure
        | import("@casual-simulation/aux-records/crud").CrudListItemsSuccess<any>
        | {
            success: false;
            errorCode: "not_supported";
            errorMessage: string;
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      getPackageVersion: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodString;
            major: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>
            >;
            minor: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>
            >;
            patch: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>
            >;
            tag: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            sha256: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
            key: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records/packages/version").GetPackageVersionResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      recordPackageVersion: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            item: import("zod").ZodObject<
              {
                address: import("zod").ZodString;
                key: import("zod").ZodObject<
                  {
                    major: import("zod").ZodInt;
                    minor: import("zod").ZodInt;
                    patch: import("zod").ZodInt;
                    tag: import("zod").ZodPrefault<
                      import("zod").ZodNullable<
                        import("zod").ZodOptional<
                          import("zod").ZodNullable<import("zod").ZodString>
                        >
                      >
                    >;
                  },
                  import("zod/v4/core").$strip
                >;
                auxFileRequest: import("zod").ZodObject<
                  {
                    fileSha256Hex: import("zod").ZodString;
                    fileByteLength: import("zod").ZodInt;
                    fileMimeType: import("zod").ZodString;
                    fileDescription: import("zod").ZodNullable<
                      import("zod").ZodOptional<import("zod").ZodString>
                    >;
                  },
                  import("zod/v4/core").$strip
                >;
                entitlements: import("zod").ZodArray<
                  import("zod").ZodObject<
                    {
                      feature: import("zod").ZodEnum<{
                        search: "search";
                        inst: "inst";
                        file: "file";
                        event: "event";
                        data: "data";
                        webhook: "webhook";
                        notification: "notification";
                        package: "package";
                        database: "database";
                        permissions: "permissions";
                        ai: "ai";
                      }>;
                      scope: import("zod").ZodEnum<{
                        shared: "shared";
                        personal: "personal";
                        owned: "owned";
                        studio: "studio";
                        designated: "designated";
                      }>;
                      designatedRecords: import("zod").ZodOptional<
                        import("zod").ZodArray<import("zod").ZodString>
                      >;
                    },
                    import("zod/v4/core").$strip
                  >
                >;
                description: import("zod").ZodString;
                markers: import("zod").ZodNullable<
                  import("zod").ZodOptional<
                    import("zod").ZodArray<import("zod").ZodString>
                  >
                >;
              },
              import("zod/v4/core").$strip
            >;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records/packages/version").RecordPackageVersionResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      listPackageVersions: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodString;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records/crud").CrudListItemsFailure
        | import("@casual-simulation/aux-records/crud").CrudListItemsSuccess<
            import("@casual-simulation/aux-records").PackageRecordVersion
          >
        | {
            success: false;
            errorCode: "not_supported";
            errorMessage: string;
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      erasePackageVersion: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodString;
            key: import("zod").ZodObject<
              {
                major: import("zod").ZodInt;
                minor: import("zod").ZodInt;
                patch: import("zod").ZodInt;
                tag: import("zod").ZodPrefault<import("zod").ZodString>;
              },
              import("zod/v4/core").$strip
            >;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records/crud").CrudEraseItemResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      reviewPackageVersion: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            packageVersionId: import("zod").ZodString;
            review: import("zod").ZodObject<
              {
                id: import("zod").ZodNullable<
                  import("zod").ZodOptional<import("zod").ZodString>
                >;
                approved: import("zod").ZodBoolean;
                approvalType: import("zod").ZodNullable<
                  import("zod").ZodEnum<{
                    normal: "normal";
                    super: "super";
                  }>
                >;
                reviewStatus: import("zod").ZodEnum<{
                  pending: "pending";
                  rejected: "rejected";
                  approved: "approved";
                }>;
                reviewComments: import("zod").ZodString;
              },
              import("zod/v4/core").$strip
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records/packages/version").ReviewPackageVersionResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      installPackage: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            inst: import("zod").ZodString;
            branch: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            instances: import("zod").ZodOptional<
              import("zod").ZodPipe<
                import("zod").ZodTransform<unknown, unknown>,
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
            downgrade: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodBoolean>
            >;
            package: import("zod").ZodObject<
              {
                recordName: import("zod").ZodString;
                address: import("zod").ZodString;
                key: import("zod").ZodNullable<
                  import("zod").ZodOptional<
                    import("zod").ZodUnion<
                      readonly [
                        import("zod").ZodString,
                        import("zod").ZodObject<
                          {
                            major: import("zod").ZodNullable<
                              import("zod").ZodOptional<import("zod").ZodInt>
                            >;
                            minor: import("zod").ZodNullable<
                              import("zod").ZodOptional<import("zod").ZodInt>
                            >;
                            patch: import("zod").ZodNullable<
                              import("zod").ZodOptional<import("zod").ZodInt>
                            >;
                            tag: import("zod").ZodNullable<
                              import("zod").ZodOptional<import("zod").ZodString>
                            >;
                            sha256: import("zod").ZodNullable<
                              import("zod").ZodOptional<import("zod").ZodString>
                            >;
                          },
                          import("zod/v4/core").$strip
                        >,
                      ]
                    >
                  >
                >;
              },
              import("zod/v4/core").$strip
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").LoadPackageResult
        | {
            success: false;
            errorCode: "not_supported";
            errorMessage: string;
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      listInstalledPackages: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            inst: import("zod").ZodString;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").ListInstalledPackagesResult
        | {
            success: false;
            errorCode: "not_supported";
            errorMessage: string;
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      recordSearchCollection: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            item: import("zod").ZodNonOptional<
              import("zod").ZodObject<
                {
                  address: import("zod").ZodString;
                  markers: import("zod").ZodArray<import("zod").ZodString>;
                  schema: import("zod").ZodObject<
                    {},
                    import("zod/v4/core").$catchall<
                      import("zod").ZodObject<
                        {
                          type: import("zod").ZodEnum<{
                            string: "string";
                            object: "object";
                            image: "image";
                            float: "float";
                            auto: "auto";
                            int32: "int32";
                            int64: "int64";
                            "string[]": "string[]";
                            "int32[]": "int32[]";
                            "int64[]": "int64[]";
                            "float[]": "float[]";
                            bool: "bool";
                            "bool[]": "bool[]";
                            geopoint: "geopoint";
                            "geopoint[]": "geopoint[]";
                            geopolygon: "geopolygon";
                            "object[]": "object[]";
                            "string*": "string*";
                          }>;
                          optional: import("zod").ZodNullable<
                            import("zod").ZodOptional<import("zod").ZodBoolean>
                          >;
                          index: import("zod").ZodNullable<
                            import("zod").ZodOptional<import("zod").ZodBoolean>
                          >;
                          store: import("zod").ZodNullable<
                            import("zod").ZodOptional<import("zod").ZodBoolean>
                          >;
                          sort: import("zod").ZodNullable<
                            import("zod").ZodOptional<import("zod").ZodBoolean>
                          >;
                          infix: import("zod").ZodNullable<
                            import("zod").ZodOptional<import("zod").ZodBoolean>
                          >;
                          locale: import("zod").ZodNullable<
                            import("zod").ZodOptional<import("zod").ZodString>
                          >;
                          stem: import("zod").ZodNullable<
                            import("zod").ZodOptional<import("zod").ZodBoolean>
                          >;
                          drop: import("zod").ZodNullable<
                            import("zod").ZodOptional<import("zod").ZodBoolean>
                          >;
                        },
                        import("zod/v4/core").$strip
                      >
                    >
                  >;
                },
                import("zod/v4/core").$strip
              >
            >;
            instances: import("zod").ZodOptional<
              import("zod").ZodPipe<
                import("zod").ZodTransform<unknown, unknown>,
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records/crud").CrudRecordItemResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      getSearchCollection: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodString;
            instances: import("zod").ZodOptional<
              import("zod").ZodPipe<
                import("zod").ZodTransform<unknown, unknown>,
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records/crud").CrudGetItemResult<any>,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      eraseSearchCollection: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodString;
            instances: import("zod").ZodOptional<
              import("zod").ZodPipe<
                import("zod").ZodTransform<unknown, unknown>,
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records/crud").CrudEraseItemResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      listSearchCollections: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodOptional<
              import("zod").ZodNullable<import("zod").ZodString>
            >;
            marker: import("zod").ZodOptional<import("zod").ZodString>;
            sort: import("zod").ZodOptional<
              import("zod").ZodEnum<{
                ascending: "ascending";
                descending: "descending";
              }>
            >;
            instances: import("zod").ZodOptional<
              import("zod").ZodPipe<
                import("zod").ZodTransform<unknown, unknown>,
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records/crud").CrudListItemsFailure
        | import("@casual-simulation/aux-records/crud").CrudListItemsSuccess<any>
        | {
            success: false;
            errorCode: "not_supported";
            errorMessage: string;
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      recordSearchDocument: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodString;
            document: import("zod").ZodObject<
              {
                recordName: import("zod").ZodNullable<
                  import("zod").ZodOptional<import("zod").ZodString>
                >;
                address: import("zod").ZodNullable<
                  import("zod").ZodOptional<import("zod").ZodString>
                >;
                resourceKind: import("zod").ZodNullable<
                  import("zod").ZodOptional<
                    import("zod").ZodEnum<{
                      search: "search";
                      inst: "inst";
                      file: "file";
                      event: "event";
                      role: "role";
                      data: "data";
                      marker: "marker";
                      loom: "loom";
                      "ai.sloyd": "ai.sloyd";
                      "ai.hume": "ai.hume";
                      "ai.openai.realtime": "ai.openai.realtime";
                      "ai.chat": "ai.chat";
                      "ai.image": "ai.image";
                      "ai.skybox": "ai.skybox";
                      webhook: "webhook";
                      notification: "notification";
                      package: "package";
                      "package.version": "package.version";
                      database: "database";
                      purchasableItem: "purchasableItem";
                      contract: "contract";
                      invoice: "invoice";
                    }>
                  >
                >;
              },
              import("zod/v4/core").$catchall<
                import("zod").ZodUnion<
                  readonly [
                    import("zod").ZodString,
                    import("zod").ZodNumber,
                    import("zod").ZodBoolean,
                    import("zod").ZodArray<import("zod").ZodString>,
                    import("zod").ZodArray<import("zod").ZodNumber>,
                    import("zod").ZodArray<import("zod").ZodBoolean>,
                    import("zod").ZodObject<
                      {},
                      import("zod/v4/core").$catchall<
                        import("zod").ZodUnion<
                          readonly [
                            import("zod").ZodString,
                            import("zod").ZodNumber,
                            import("zod").ZodBoolean,
                          ]
                        >
                      >
                    >,
                  ]
                >
              >
            >;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          }
        | import("@casual-simulation/aux-common").GenericResult<
            import("@casual-simulation/aux-records").SearchDocumentInfo,
            import("@casual-simulation/aux-common").SimpleError
          >,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      eraseSearchDocument: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodString;
            documentId: import("zod").ZodString;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          }
        | import("@casual-simulation/aux-common").GenericResult<
            import("@casual-simulation/aux-records").SearchDocumentInfo,
            import("@casual-simulation/aux-common").SimpleError
          >,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      syncSearchRecord: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodString;
            targetRecordName: import("zod").ZodString;
            targetResourceKind: import("zod").ZodEnum<{
              data: "data";
            }>;
            targetMarker: import("zod").ZodString;
            targetMapping: import("zod").ZodArray<
              import("zod").ZodTuple<
                [import("zod").ZodString, import("zod").ZodString],
                null
              >
            >;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          }
        | import("@casual-simulation/aux-common").GenericResult<
            {
              syncId: string;
            },
            import("@casual-simulation/aux-common").SimpleError
          >,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      unsyncSearchRecord: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            syncId: import("zod").ZodString;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          }
        | import("@casual-simulation/aux-common").GenericResult<
            void,
            import("@casual-simulation/aux-common").SimpleError
          >,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      search: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodString;
            query: import("zod").ZodObject<
              {
                q: import("zod").ZodString;
                queryBy: import("zod").ZodString;
                filterBy: import("zod").ZodNullable<
                  import("zod").ZodOptional<import("zod").ZodString>
                >;
              },
              import("zod/v4/core").$catchall<
                import("zod").ZodUnion<
                  readonly [
                    import("zod").ZodString,
                    import("zod").ZodBoolean,
                    import("zod").ZodNumber,
                  ]
                >
              >
            >;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-common").GenericResult<
            {
              found: number;
              outOf: number;
              page: number;
              searchTimeMs: number;
              hits: import("@casual-simulation/aux-records").SearchHit[];
            },
            import("@casual-simulation/aux-common").SimpleError
          >,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      recordDatabase: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            item: import("zod").ZodNonOptional<
              import("zod").ZodObject<
                {
                  address: import("zod").ZodString;
                  markers: import("zod").ZodArray<import("zod").ZodString>;
                },
                import("zod/v4/core").$strip
              >
            >;
            instances: import("zod").ZodOptional<
              import("zod").ZodPipe<
                import("zod").ZodTransform<unknown, unknown>,
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records/crud").CrudRecordItemResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      getDatabase: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodString;
            instances: import("zod").ZodOptional<
              import("zod").ZodPipe<
                import("zod").ZodTransform<unknown, unknown>,
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records/crud").CrudGetItemResult<any>,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      eraseDatabase: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodString;
            instances: import("zod").ZodOptional<
              import("zod").ZodPipe<
                import("zod").ZodTransform<unknown, unknown>,
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records/crud").CrudEraseItemResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      listDatabases: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodOptional<
              import("zod").ZodNullable<import("zod").ZodString>
            >;
            marker: import("zod").ZodOptional<import("zod").ZodString>;
            sort: import("zod").ZodOptional<
              import("zod").ZodEnum<{
                ascending: "ascending";
                descending: "descending";
              }>
            >;
            instances: import("zod").ZodOptional<
              import("zod").ZodPipe<
                import("zod").ZodTransform<unknown, unknown>,
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records/crud").CrudListItemsFailure
        | import("@casual-simulation/aux-records/crud").CrudListItemsSuccess<any>
        | {
            success: false;
            errorCode: "not_supported";
            errorMessage: string;
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      queryDatabase: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodString;
            statements: import("zod").ZodArray<
              import("zod").ZodObject<
                {
                  query: import("zod").ZodString;
                  params: import("zod").ZodPrefault<
                    import("zod").ZodOptional<
                      import("zod").ZodArray<import("zod").ZodAny>
                    >
                  >;
                },
                import("zod/v4/core").$strip
              >
            >;
            readonly: import("zod").ZodPrefault<import("zod").ZodBoolean>;
            automaticTransaction: import("zod").ZodPrefault<
              import("zod").ZodOptional<import("zod").ZodBoolean>
            >;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-common").GenericResult<
            import("@casual-simulation/aux-records/database").QueryResult[],
            import("@casual-simulation/aux-common").SimpleError
          >,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      listRecords: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            studioId: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            userId: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").ListRecordsSuccess
        | import("@casual-simulation/aux-records").ListRecordsFailure
        | {
            readonly success: false;
            readonly errorCode: "not_authorized";
            readonly errorMessage: "You are not authorized to perform this action.";
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      createRecordKey: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            policy: import("zod").ZodString;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").CreatePublicRecordKeyResult
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      grantPermission: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            permission: import("zod").ZodDiscriminatedUnion<
              [
                import("zod").ZodObject<
                  {
                    subjectType: import("zod").ZodEnum<{
                      inst: "inst";
                      user: "user";
                      role: "role";
                    }>;
                    subjectId: import("zod").ZodString;
                    resourceId: import("zod").ZodOptional<
                      import("zod").ZodNullable<import("zod").ZodString>
                    >;
                    expireTimeMs: import("zod").ZodNullable<
                      import("zod").ZodNumber
                    >;
                    marker: import("zod").ZodOptional<import("zod").ZodString>;
                    resourceKind: import("zod").ZodLiteral<"data">;
                    action: import("zod").ZodNullable<
                      import("zod").ZodEnum<{
                        read: "read";
                        create: "create";
                        update: "update";
                        delete: "delete";
                        list: "list";
                      }>
                    >;
                  },
                  import("zod/v4/core").$strip
                >,
                import("zod").ZodObject<
                  {
                    subjectType: import("zod").ZodEnum<{
                      inst: "inst";
                      user: "user";
                      role: "role";
                    }>;
                    subjectId: import("zod").ZodString;
                    resourceId: import("zod").ZodOptional<
                      import("zod").ZodNullable<import("zod").ZodString>
                    >;
                    expireTimeMs: import("zod").ZodNullable<
                      import("zod").ZodNumber
                    >;
                    marker: import("zod").ZodOptional<import("zod").ZodString>;
                    resourceKind: import("zod").ZodLiteral<"file">;
                    action: import("zod").ZodNullable<
                      import("zod").ZodEnum<{
                        read: "read";
                        create: "create";
                        update: "update";
                        delete: "delete";
                        list: "list";
                      }>
                    >;
                    options: import("zod").ZodObject<
                      {
                        maxFileSizeInBytes: import("zod").ZodOptional<
                          import("zod").ZodNumber
                        >;
                        allowedMimeTypes: import("zod").ZodOptional<
                          import("zod").ZodUnion<
                            readonly [
                              import("zod").ZodLiteral<true>,
                              import("zod").ZodArray<import("zod").ZodString>,
                            ]
                          >
                        >;
                      },
                      import("zod/v4/core").$strip
                    >;
                  },
                  import("zod/v4/core").$strip
                >,
                import("zod").ZodObject<
                  {
                    subjectType: import("zod").ZodEnum<{
                      inst: "inst";
                      user: "user";
                      role: "role";
                    }>;
                    subjectId: import("zod").ZodString;
                    expireTimeMs: import("zod").ZodNullable<
                      import("zod").ZodNumber
                    >;
                    marker: import("zod").ZodOptional<import("zod").ZodString>;
                    resourceKind: import("zod").ZodLiteral<"event">;
                    resourceId: import("zod").ZodNullable<
                      import("zod").ZodString
                    >;
                    action: import("zod").ZodNullable<
                      import("zod").ZodEnum<{
                        update: "update";
                        increment: "increment";
                        count: "count";
                        list: "list";
                      }>
                    >;
                  },
                  import("zod/v4/core").$strip
                >,
                import("zod").ZodObject<
                  {
                    subjectType: import("zod").ZodEnum<{
                      inst: "inst";
                      user: "user";
                      role: "role";
                    }>;
                    subjectId: import("zod").ZodString;
                    resourceId: import("zod").ZodOptional<
                      import("zod").ZodNullable<import("zod").ZodString>
                    >;
                    expireTimeMs: import("zod").ZodNullable<
                      import("zod").ZodNumber
                    >;
                    marker: import("zod").ZodOptional<import("zod").ZodString>;
                    resourceKind: import("zod").ZodLiteral<"marker">;
                    action: import("zod").ZodNullable<
                      import("zod").ZodEnum<{
                        read: "read";
                        assign: "assign";
                        unassign: "unassign";
                        grantPermission: "grantPermission";
                        revokePermission: "revokePermission";
                      }>
                    >;
                  },
                  import("zod/v4/core").$strip
                >,
                import("zod").ZodObject<
                  {
                    subjectType: import("zod").ZodEnum<{
                      inst: "inst";
                      user: "user";
                      role: "role";
                    }>;
                    subjectId: import("zod").ZodString;
                    resourceId: import("zod").ZodOptional<
                      import("zod").ZodNullable<import("zod").ZodString>
                    >;
                    expireTimeMs: import("zod").ZodNullable<
                      import("zod").ZodNumber
                    >;
                    marker: import("zod").ZodOptional<import("zod").ZodString>;
                    resourceKind: import("zod").ZodLiteral<"role">;
                    action: import("zod").ZodNullable<
                      import("zod").ZodEnum<{
                        read: "read";
                        update: "update";
                        list: "list";
                        grant: "grant";
                        revoke: "revoke";
                      }>
                    >;
                    options: import("zod").ZodObject<
                      {
                        maxDurationMs: import("zod").ZodOptional<
                          import("zod").ZodNumber
                        >;
                      },
                      import("zod/v4/core").$strip
                    >;
                  },
                  import("zod/v4/core").$strip
                >,
                import("zod").ZodObject<
                  {
                    subjectType: import("zod").ZodEnum<{
                      inst: "inst";
                      user: "user";
                      role: "role";
                    }>;
                    subjectId: import("zod").ZodString;
                    resourceId: import("zod").ZodOptional<
                      import("zod").ZodNullable<import("zod").ZodString>
                    >;
                    expireTimeMs: import("zod").ZodNullable<
                      import("zod").ZodNumber
                    >;
                    marker: import("zod").ZodOptional<import("zod").ZodString>;
                    resourceKind: import("zod").ZodLiteral<"inst">;
                    action: import("zod").ZodNullable<
                      import("zod").ZodEnum<{
                        read: "read";
                        create: "create";
                        update: "update";
                        delete: "delete";
                        list: "list";
                        sendAction: "sendAction";
                        updateData: "updateData";
                      }>
                    >;
                  },
                  import("zod/v4/core").$strip
                >,
                import("zod").ZodObject<
                  {
                    subjectType: import("zod").ZodEnum<{
                      inst: "inst";
                      user: "user";
                      role: "role";
                    }>;
                    subjectId: import("zod").ZodString;
                    resourceId: import("zod").ZodOptional<
                      import("zod").ZodNullable<import("zod").ZodString>
                    >;
                    expireTimeMs: import("zod").ZodNullable<
                      import("zod").ZodNumber
                    >;
                    marker: import("zod").ZodOptional<import("zod").ZodString>;
                    resourceKind: import("zod").ZodLiteral<"loom">;
                    action: import("zod").ZodNullable<
                      import("zod").ZodEnum<{
                        create: "create";
                      }>
                    >;
                  },
                  import("zod/v4/core").$strip
                >,
                import("zod").ZodObject<
                  {
                    subjectType: import("zod").ZodEnum<{
                      inst: "inst";
                      user: "user";
                      role: "role";
                    }>;
                    subjectId: import("zod").ZodString;
                    resourceId: import("zod").ZodOptional<
                      import("zod").ZodNullable<import("zod").ZodString>
                    >;
                    expireTimeMs: import("zod").ZodNullable<
                      import("zod").ZodNumber
                    >;
                    marker: import("zod").ZodOptional<import("zod").ZodString>;
                    resourceKind: import("zod").ZodLiteral<"ai.sloyd">;
                    action: import("zod").ZodNullable<
                      import("zod").ZodEnum<{
                        create: "create";
                      }>
                    >;
                  },
                  import("zod/v4/core").$strip
                >,
                import("zod").ZodObject<
                  {
                    subjectType: import("zod").ZodEnum<{
                      inst: "inst";
                      user: "user";
                      role: "role";
                    }>;
                    subjectId: import("zod").ZodString;
                    resourceId: import("zod").ZodOptional<
                      import("zod").ZodNullable<import("zod").ZodString>
                    >;
                    expireTimeMs: import("zod").ZodNullable<
                      import("zod").ZodNumber
                    >;
                    marker: import("zod").ZodOptional<import("zod").ZodString>;
                    resourceKind: import("zod").ZodLiteral<"ai.hume">;
                    action: import("zod").ZodNullable<
                      import("zod").ZodEnum<{
                        create: "create";
                      }>
                    >;
                  },
                  import("zod/v4/core").$strip
                >,
                import("zod").ZodObject<
                  {
                    subjectType: import("zod").ZodEnum<{
                      inst: "inst";
                      user: "user";
                      role: "role";
                    }>;
                    subjectId: import("zod").ZodString;
                    resourceId: import("zod").ZodOptional<
                      import("zod").ZodNullable<import("zod").ZodString>
                    >;
                    expireTimeMs: import("zod").ZodNullable<
                      import("zod").ZodNumber
                    >;
                    marker: import("zod").ZodOptional<import("zod").ZodString>;
                    resourceKind: import("zod").ZodLiteral<"ai.openai.realtime">;
                    action: import("zod").ZodNullable<
                      import("zod").ZodEnum<{
                        create: "create";
                      }>
                    >;
                  },
                  import("zod/v4/core").$strip
                >,
                import("zod").ZodObject<
                  {
                    subjectType: import("zod").ZodEnum<{
                      inst: "inst";
                      user: "user";
                      role: "role";
                    }>;
                    subjectId: import("zod").ZodString;
                    resourceId: import("zod").ZodOptional<
                      import("zod").ZodNullable<import("zod").ZodString>
                    >;
                    expireTimeMs: import("zod").ZodNullable<
                      import("zod").ZodNumber
                    >;
                    marker: import("zod").ZodOptional<import("zod").ZodString>;
                    resourceKind: import("zod").ZodLiteral<"ai.chat">;
                    action: import("zod").ZodNullable<
                      import("zod").ZodEnum<{
                        create: "create";
                      }>
                    >;
                  },
                  import("zod/v4/core").$strip
                >,
                import("zod").ZodObject<
                  {
                    subjectType: import("zod").ZodEnum<{
                      inst: "inst";
                      user: "user";
                      role: "role";
                    }>;
                    subjectId: import("zod").ZodString;
                    resourceId: import("zod").ZodOptional<
                      import("zod").ZodNullable<import("zod").ZodString>
                    >;
                    expireTimeMs: import("zod").ZodNullable<
                      import("zod").ZodNumber
                    >;
                    marker: import("zod").ZodOptional<import("zod").ZodString>;
                    resourceKind: import("zod").ZodLiteral<"ai.image">;
                    action: import("zod").ZodNullable<
                      import("zod").ZodEnum<{
                        create: "create";
                      }>
                    >;
                  },
                  import("zod/v4/core").$strip
                >,
                import("zod").ZodObject<
                  {
                    subjectType: import("zod").ZodEnum<{
                      inst: "inst";
                      user: "user";
                      role: "role";
                    }>;
                    subjectId: import("zod").ZodString;
                    resourceId: import("zod").ZodOptional<
                      import("zod").ZodNullable<import("zod").ZodString>
                    >;
                    expireTimeMs: import("zod").ZodNullable<
                      import("zod").ZodNumber
                    >;
                    marker: import("zod").ZodOptional<import("zod").ZodString>;
                    resourceKind: import("zod").ZodLiteral<"ai.skybox">;
                    action: import("zod").ZodNullable<
                      import("zod").ZodEnum<{
                        create: "create";
                      }>
                    >;
                  },
                  import("zod/v4/core").$strip
                >,
                import("zod").ZodObject<
                  {
                    subjectType: import("zod").ZodEnum<{
                      inst: "inst";
                      user: "user";
                      role: "role";
                    }>;
                    subjectId: import("zod").ZodString;
                    resourceId: import("zod").ZodOptional<
                      import("zod").ZodNullable<import("zod").ZodString>
                    >;
                    expireTimeMs: import("zod").ZodNullable<
                      import("zod").ZodNumber
                    >;
                    marker: import("zod").ZodOptional<import("zod").ZodString>;
                    resourceKind: import("zod").ZodLiteral<"webhook">;
                    action: import("zod").ZodNullable<
                      import("zod").ZodEnum<{
                        run: "run";
                        read: "read";
                        create: "create";
                        update: "update";
                        delete: "delete";
                        list: "list";
                      }>
                    >;
                  },
                  import("zod/v4/core").$strip
                >,
                import("zod").ZodObject<
                  {
                    subjectType: import("zod").ZodEnum<{
                      inst: "inst";
                      user: "user";
                      role: "role";
                    }>;
                    subjectId: import("zod").ZodString;
                    resourceId: import("zod").ZodOptional<
                      import("zod").ZodNullable<import("zod").ZodString>
                    >;
                    expireTimeMs: import("zod").ZodNullable<
                      import("zod").ZodNumber
                    >;
                    marker: import("zod").ZodOptional<import("zod").ZodString>;
                    resourceKind: import("zod").ZodLiteral<"notification">;
                    action: import("zod").ZodNullable<
                      import("zod").ZodEnum<{
                        read: "read";
                        create: "create";
                        update: "update";
                        delete: "delete";
                        list: "list";
                        send: "send";
                        subscribe: "subscribe";
                        unsubscribe: "unsubscribe";
                        listSubscriptions: "listSubscriptions";
                      }>
                    >;
                  },
                  import("zod/v4/core").$strip
                >,
                import("zod").ZodObject<
                  {
                    subjectType: import("zod").ZodEnum<{
                      inst: "inst";
                      user: "user";
                      role: "role";
                    }>;
                    subjectId: import("zod").ZodString;
                    resourceId: import("zod").ZodOptional<
                      import("zod").ZodNullable<import("zod").ZodString>
                    >;
                    expireTimeMs: import("zod").ZodNullable<
                      import("zod").ZodNumber
                    >;
                    marker: import("zod").ZodOptional<import("zod").ZodString>;
                    resourceKind: import("zod").ZodLiteral<"package">;
                    action: import("zod").ZodNullable<
                      import("zod").ZodEnum<{
                        run: "run";
                        read: "read";
                        create: "create";
                        update: "update";
                        delete: "delete";
                        list: "list";
                      }>
                    >;
                  },
                  import("zod/v4/core").$strip
                >,
                import("zod").ZodObject<
                  {
                    subjectType: import("zod").ZodEnum<{
                      inst: "inst";
                      user: "user";
                      role: "role";
                    }>;
                    subjectId: import("zod").ZodString;
                    resourceId: import("zod").ZodOptional<
                      import("zod").ZodNullable<import("zod").ZodString>
                    >;
                    expireTimeMs: import("zod").ZodNullable<
                      import("zod").ZodNumber
                    >;
                    marker: import("zod").ZodOptional<import("zod").ZodString>;
                    resourceKind: import("zod").ZodLiteral<"package.version">;
                    action: import("zod").ZodNullable<
                      import("zod").ZodEnum<{
                        run: "run";
                        read: "read";
                        create: "create";
                        update: "update";
                        delete: "delete";
                        list: "list";
                      }>
                    >;
                  },
                  import("zod/v4/core").$strip
                >,
                import("zod").ZodObject<
                  {
                    subjectType: import("zod").ZodEnum<{
                      inst: "inst";
                      user: "user";
                      role: "role";
                    }>;
                    subjectId: import("zod").ZodString;
                    resourceId: import("zod").ZodOptional<
                      import("zod").ZodNullable<import("zod").ZodString>
                    >;
                    expireTimeMs: import("zod").ZodNullable<
                      import("zod").ZodNumber
                    >;
                    marker: import("zod").ZodOptional<import("zod").ZodString>;
                    resourceKind: import("zod").ZodLiteral<"search">;
                    action: import("zod").ZodNullable<
                      import("zod").ZodEnum<{
                        read: "read";
                        create: "create";
                        update: "update";
                        delete: "delete";
                        list: "list";
                      }>
                    >;
                  },
                  import("zod/v4/core").$strip
                >,
                import("zod").ZodObject<
                  {
                    subjectType: import("zod").ZodEnum<{
                      inst: "inst";
                      user: "user";
                      role: "role";
                    }>;
                    subjectId: import("zod").ZodString;
                    resourceId: import("zod").ZodOptional<
                      import("zod").ZodNullable<import("zod").ZodString>
                    >;
                    expireTimeMs: import("zod").ZodNullable<
                      import("zod").ZodNumber
                    >;
                    marker: import("zod").ZodOptional<import("zod").ZodString>;
                    resourceKind: import("zod").ZodLiteral<"database">;
                    action: import("zod").ZodNullable<
                      import("zod").ZodEnum<{
                        read: "read";
                        create: "create";
                        update: "update";
                        delete: "delete";
                        list: "list";
                      }>
                    >;
                  },
                  import("zod/v4/core").$strip
                >,
                import("zod").ZodObject<
                  {
                    subjectType: import("zod").ZodEnum<{
                      inst: "inst";
                      user: "user";
                      role: "role";
                    }>;
                    subjectId: import("zod").ZodString;
                    resourceId: import("zod").ZodOptional<
                      import("zod").ZodNullable<import("zod").ZodString>
                    >;
                    expireTimeMs: import("zod").ZodNullable<
                      import("zod").ZodNumber
                    >;
                    marker: import("zod").ZodOptional<import("zod").ZodString>;
                    resourceKind: import("zod").ZodLiteral<"purchasableItem">;
                    action: import("zod").ZodNullable<
                      import("zod").ZodEnum<{
                        read: "read";
                        create: "create";
                        update: "update";
                        delete: "delete";
                        list: "list";
                        purchase: "purchase";
                      }>
                    >;
                  },
                  import("zod/v4/core").$strip
                >,
                import("zod").ZodObject<
                  {
                    subjectType: import("zod").ZodEnum<{
                      inst: "inst";
                      user: "user";
                      role: "role";
                    }>;
                    subjectId: import("zod").ZodString;
                    resourceId: import("zod").ZodOptional<
                      import("zod").ZodNullable<import("zod").ZodString>
                    >;
                    expireTimeMs: import("zod").ZodNullable<
                      import("zod").ZodNumber
                    >;
                    marker: import("zod").ZodOptional<import("zod").ZodString>;
                    resourceKind: import("zod").ZodLiteral<"contract">;
                    action: import("zod").ZodNullable<
                      import("zod").ZodEnum<{
                        read: "read";
                        create: "create";
                        update: "update";
                        delete: "delete";
                        list: "list";
                        purchase: "purchase";
                        cancel: "cancel";
                      }>
                    >;
                  },
                  import("zod/v4/core").$strip
                >,
                import("zod").ZodObject<
                  {
                    subjectType: import("zod").ZodEnum<{
                      inst: "inst";
                      user: "user";
                      role: "role";
                    }>;
                    subjectId: import("zod").ZodString;
                    resourceId: import("zod").ZodOptional<
                      import("zod").ZodNullable<import("zod").ZodString>
                    >;
                    expireTimeMs: import("zod").ZodNullable<
                      import("zod").ZodNumber
                    >;
                    marker: import("zod").ZodOptional<import("zod").ZodString>;
                    resourceKind: import("zod").ZodLiteral<"invoice">;
                    action: import("zod").ZodNullable<
                      import("zod").ZodEnum<{
                        read: "read";
                        create: "create";
                        update: "update";
                        delete: "delete";
                        list: "list";
                        approve: "approve";
                        cancel: "cancel";
                      }>
                    >;
                  },
                  import("zod/v4/core").$strip
                >,
              ],
              "resourceKind"
            >;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").GrantMarkerPermissionSuccess
        | import("@casual-simulation/aux-records").GrantMarkerPermissionFailure
        | {
            readonly success: false;
            readonly errorCode: "unacceptable_request";
            readonly errorMessage: "The given permission must have either a marker or a resourceId.";
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      revokePermission: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            permissionId: import("zod").ZodString;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").RevokePermissionResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      listPermissions: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            marker: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            resourceKind: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodEnum<{
                  search: "search";
                  inst: "inst";
                  file: "file";
                  event: "event";
                  role: "role";
                  data: "data";
                  marker: "marker";
                  loom: "loom";
                  "ai.sloyd": "ai.sloyd";
                  "ai.hume": "ai.hume";
                  "ai.openai.realtime": "ai.openai.realtime";
                  "ai.chat": "ai.chat";
                  "ai.image": "ai.image";
                  "ai.skybox": "ai.skybox";
                  webhook: "webhook";
                  notification: "notification";
                  package: "package";
                  "package.version": "package.version";
                  database: "database";
                  purchasableItem: "purchasableItem";
                  contract: "contract";
                  invoice: "invoice";
                }>
              >
            >;
            resourceId: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").ListPermissionsFailure
        | import("@casual-simulation/aux-records").ListPermissionsForMarkerSuccess
        | import("@casual-simulation/aux-records").ListPermissionsForResourceSuccess,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      listUserRoles: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            userId: import("zod").ZodString;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").ListAssignedUserRolesResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      listInstRoles: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            inst: import("zod").ZodString;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").ListAssignedInstRolesResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      listRoleAssignments: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            startingRole: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            role: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").ListRoleAssignmentsResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      grantRole: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            userId: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            inst: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            role: import("zod").ZodString;
            expireTimeMs: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodNumber>
            >;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").GrantRoleResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      revokeRole: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            userId: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            inst: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            role: import("zod").ZodString;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").RevokeRoleResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      grantEntitlement: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            packageId: import("zod").ZodString;
            userId: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            recordName: import("zod").ZodString;
            feature: import("zod").ZodEnum<{
              search: "search";
              inst: "inst";
              file: "file";
              event: "event";
              data: "data";
              webhook: "webhook";
              notification: "notification";
              package: "package";
              database: "database";
              permissions: "permissions";
              ai: "ai";
            }>;
            scope: import("zod").ZodLiteral<"designated">;
            expireTimeMs: import("zod").ZodNumber;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records").GrantEntitlementResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      revokeEntitlement: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            grantId: import("zod").ZodString;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records").RevokeEntitlementResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      listGrantedEntitlements: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            packageId: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records").ListGrantedEntitlementsResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      aiChat: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            model: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            messages: import("zod").ZodArray<
              import("zod").ZodObject<
                {
                  role: import("zod").ZodUnion<
                    readonly [
                      import("zod").ZodLiteral<"system">,
                      import("zod").ZodLiteral<"user">,
                      import("zod").ZodLiteral<"assistant">,
                      import("zod").ZodLiteral<"function">,
                    ]
                  >;
                  content: import("zod").ZodUnion<
                    readonly [
                      import("zod").ZodString,
                      import("zod").ZodArray<
                        import("zod").ZodUnion<
                          readonly [
                            import("zod").ZodObject<
                              {
                                text: import("zod").ZodString;
                              },
                              import("zod/v4/core").$strip
                            >,
                            import("zod").ZodObject<
                              {
                                base64: import("zod").ZodString;
                                mimeType: import("zod").ZodString;
                              },
                              import("zod/v4/core").$strip
                            >,
                            import("zod").ZodObject<
                              {
                                url: import("zod").ZodURL;
                              },
                              import("zod/v4/core").$strip
                            >,
                          ]
                        >
                      >,
                    ]
                  >;
                  author: import("zod").ZodOptional<import("zod").ZodString>;
                },
                import("zod/v4/core").$strip
              >
            >;
            recordName: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
            temperature: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodNumber>
            >;
            topP: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodNumber>
            >;
            presencePenalty: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodNumber>
            >;
            frequencyPenalty: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodNumber>
            >;
            enableCaching: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodBoolean>
            >;
            stopWords: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records/AIController").AIChatResponse
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          }
        | {
            success: false;
            errorCode: "not_supported";
            errorMessage: string;
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      aiChatStream: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            model: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            messages: import("zod").ZodArray<
              import("zod").ZodObject<
                {
                  role: import("zod").ZodUnion<
                    readonly [
                      import("zod").ZodLiteral<"system">,
                      import("zod").ZodLiteral<"user">,
                      import("zod").ZodLiteral<"assistant">,
                      import("zod").ZodLiteral<"function">,
                    ]
                  >;
                  content: import("zod").ZodUnion<
                    readonly [
                      import("zod").ZodString,
                      import("zod").ZodArray<
                        import("zod").ZodUnion<
                          readonly [
                            import("zod").ZodObject<
                              {
                                text: import("zod").ZodString;
                              },
                              import("zod/v4/core").$strip
                            >,
                            import("zod").ZodObject<
                              {
                                base64: import("zod").ZodString;
                                mimeType: import("zod").ZodString;
                              },
                              import("zod/v4/core").$strip
                            >,
                            import("zod").ZodObject<
                              {
                                url: import("zod").ZodURL;
                              },
                              import("zod/v4/core").$strip
                            >,
                          ]
                        >
                      >,
                    ]
                  >;
                  author: import("zod").ZodOptional<import("zod").ZodString>;
                },
                import("zod/v4/core").$strip
              >
            >;
            recordName: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
            temperature: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodNumber>
            >;
            topP: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodNumber>
            >;
            presencePenalty: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodNumber>
            >;
            frequencyPenalty: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodNumber>
            >;
            enableCaching: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodBoolean>
            >;
            stopWords: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | AsyncGenerator<
            Omit<
              import("@casual-simulation/aux-records").AIChatInterfaceStreamResponse,
              "totalTokens" | "inputTokens" | "outputTokens"
            >,
            import("@casual-simulation/aux-records/AIController").AIChatStreamResponse,
            any
          >
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          }
        | {
            success: false;
            errorCode: "not_supported";
            errorMessage: string;
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      aiListChatModels: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          }
        | {
            success: false;
            errorCode: "not_supported";
            errorMessage: string;
          }
        | import("@casual-simulation/aux-common").GenericResult<
            import("@casual-simulation/aux-records/AIController").ListedChatModel[],
            import("@casual-simulation/aux-common").SimpleError
          >,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      createAiSkybox: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            prompt: import("zod").ZodString;
            recordName: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            negativePrompt: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            blockadeLabs: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodObject<
                  {
                    skyboxStyleId: import("zod").ZodNullable<
                      import("zod").ZodOptional<import("zod").ZodNumber>
                    >;
                    remixImagineId: import("zod").ZodNullable<
                      import("zod").ZodOptional<import("zod").ZodNumber>
                    >;
                    seed: import("zod").ZodNullable<
                      import("zod").ZodOptional<import("zod").ZodNumber>
                    >;
                  },
                  import("zod/v4/core").$strip
                >
              >
            >;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records/AIController").AIGenerateSkyboxResponse
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          }
        | {
            success: false;
            errorCode: "not_supported";
            errorMessage: string;
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      getAiSkybox: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            skyboxId: import("zod").ZodString;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records/AIController").AIGetSkyboxResponse
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          }
        | {
            success: false;
            errorCode: "not_supported";
            errorMessage: string;
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      createAiImage: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            prompt: import("zod").ZodString;
            recordName: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            model: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            negativePrompt: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            width: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodInt>
            >;
            height: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodInt>
            >;
            seed: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodInt>
            >;
            numberOfImages: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodInt>
            >;
            steps: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodInt>
            >;
            sampler: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            cfgScale: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodInt>
            >;
            clipGuidancePreset: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            stylePreset: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records/AIController").AIGenerateImageResponse
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          }
        | {
            success: false;
            errorCode: "not_supported";
            errorMessage: string;
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      getHumeAccessToken: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records/AIController").AIHumeGetAccessTokenResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      createSloydModel: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            outputMimeType: import("zod").ZodPrefault<
              import("zod").ZodEnum<{
                "model/gltf+json": "model/gltf+json";
                "model/gltf-binary": "model/gltf-binary";
              }>
            >;
            prompt: import("zod").ZodString;
            levelOfDetail: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodNumber>
            >;
            baseModelId: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            thumbnail: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodObject<
                  {
                    type: import("zod").ZodLiteral<"image/png">;
                    width: import("zod").ZodInt;
                    height: import("zod").ZodInt;
                  },
                  import("zod/v4/core").$strip
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").AISloydGenerateModelResponse
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          }
        | {
            success: false;
            errorCode: "not_supported";
            errorMessage: string;
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      getLoomAccessToken: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").LoomGetTokenResult
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          }
        | {
            success: false;
            errorCode: "not_supported";
            errorMessage: string;
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      createOpenAIRealtimeSession: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            request: import("zod").ZodObject<
              {
                model: import("zod").ZodString;
                instructions: import("zod").ZodNullable<
                  import("zod").ZodOptional<import("zod").ZodString>
                >;
                modalities: import("zod").ZodNullable<
                  import("zod").ZodOptional<
                    import("zod").ZodArray<
                      import("zod").ZodEnum<{
                        audio: "audio";
                        text: "text";
                      }>
                    >
                  >
                >;
                maxResponseOutputTokens: import("zod").ZodNullable<
                  import("zod").ZodOptional<import("zod").ZodInt>
                >;
                inputAudioFormat: import("zod").ZodNullable<
                  import("zod").ZodOptional<
                    import("zod").ZodEnum<{
                      pcm16: "pcm16";
                      g711_ulaw: "g711_ulaw";
                      g711_alaw: "g711_alaw";
                    }>
                  >
                >;
                inputAudioNoiseReduction: import("zod").ZodNullable<
                  import("zod").ZodOptional<
                    import("zod").ZodObject<
                      {
                        type: import("zod").ZodNullable<
                          import("zod").ZodOptional<
                            import("zod").ZodEnum<{
                              near_field: "near_field";
                              far_field: "far_field";
                            }>
                          >
                        >;
                      },
                      import("zod/v4/core").$strip
                    >
                  >
                >;
                inputAudioTranscription: import("zod").ZodNullable<
                  import("zod").ZodOptional<
                    import("zod").ZodObject<
                      {
                        language: import("zod").ZodNullable<
                          import("zod").ZodOptional<import("zod").ZodString>
                        >;
                        model: import("zod").ZodNullable<
                          import("zod").ZodOptional<import("zod").ZodString>
                        >;
                        prompt: import("zod").ZodNullable<
                          import("zod").ZodOptional<import("zod").ZodString>
                        >;
                      },
                      import("zod/v4/core").$strip
                    >
                  >
                >;
                outputAudioFormat: import("zod").ZodNullable<
                  import("zod").ZodOptional<
                    import("zod").ZodEnum<{
                      pcm16: "pcm16";
                      g711_ulaw: "g711_ulaw";
                      g711_alaw: "g711_alaw";
                    }>
                  >
                >;
                temperature: import("zod").ZodNullable<
                  import("zod").ZodOptional<import("zod").ZodNumber>
                >;
                toolChoice: import("zod").ZodNullable<
                  import("zod").ZodOptional<import("zod").ZodString>
                >;
                tools: import("zod").ZodNullable<
                  import("zod").ZodOptional<
                    import("zod").ZodArray<
                      import("zod").ZodObject<
                        {
                          description: import("zod").ZodNullable<
                            import("zod").ZodOptional<import("zod").ZodString>
                          >;
                          name: import("zod").ZodString;
                          parameters: import("zod").ZodNullable<
                            import("zod").ZodOptional<import("zod").ZodAny>
                          >;
                          type: import("zod").ZodNullable<
                            import("zod").ZodOptional<
                              import("zod").ZodEnum<{
                                function: "function";
                              }>
                            >
                          >;
                        },
                        import("zod/v4/core").$strip
                      >
                    >
                  >
                >;
                turnDetection: import("zod").ZodNullable<
                  import("zod").ZodOptional<
                    import("zod").ZodObject<
                      {
                        createResponse: import("zod").ZodNullable<
                          import("zod").ZodOptional<import("zod").ZodBoolean>
                        >;
                        eagerness: import("zod").ZodNullable<
                          import("zod").ZodOptional<
                            import("zod").ZodEnum<{
                              high: "high";
                              low: "low";
                              medium: "medium";
                            }>
                          >
                        >;
                        interruptResponse: import("zod").ZodNullable<
                          import("zod").ZodOptional<import("zod").ZodBoolean>
                        >;
                        prefixPaddingMs: import("zod").ZodNullable<
                          import("zod").ZodOptional<import("zod").ZodNumber>
                        >;
                        silenceDurationMs: import("zod").ZodNullable<
                          import("zod").ZodOptional<import("zod").ZodNumber>
                        >;
                        threshold: import("zod").ZodNullable<
                          import("zod").ZodOptional<import("zod").ZodNumber>
                        >;
                        type: import("zod").ZodNullable<
                          import("zod").ZodOptional<
                            import("zod").ZodEnum<{
                              server_vad: "server_vad";
                              semantic_vad: "semantic_vad";
                            }>
                          >
                        >;
                      },
                      import("zod/v4/core").$strip
                    >
                  >
                >;
                voice: import("zod").ZodNullable<
                  import("zod").ZodOptional<import("zod").ZodString>
                >;
              },
              import("zod/v4/core").$strip
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records").AICreateOpenAIRealtimeSessionTokenResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      getStudio: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            studioId: import("zod").ZodString;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").GetStudioResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      createStudio: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            displayName: import("zod").ZodString;
            ownerStudioComId: import("zod").ZodOptional<
              import("zod").ZodNullable<import("zod").ZodString>
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").CreateStudioSuccess
        | import("@casual-simulation/aux-records").CreateStudioInComIdFailure,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      updateStudio: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            id: import("zod").ZodString;
            displayName: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            logoUrl: import("zod").ZodOptional<
              import("zod").ZodNullable<import("zod").ZodURL>
            >;
            logoBackgroundColor: import("zod").ZodOptional<
              import("zod").ZodNullable<import("zod").ZodString>
            >;
            comIdConfig: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodObject<
                  {
                    allowedStudioCreators: import("zod").ZodUnion<
                      readonly [
                        import("zod").ZodLiteral<"anyone">,
                        import("zod").ZodLiteral<"only-members">,
                      ]
                    >;
                  },
                  import("zod/v4/core").$strip
                >
              >
            >;
            playerConfig: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodObject<
                  {
                    disableVM: import("zod").ZodOptional<
                      import("zod").ZodOptional<
                        import("zod").ZodNullable<import("zod").ZodBoolean>
                      >
                    >;
                    ab1BootstrapURL: import("zod").ZodOptional<
                      import("zod").ZodOptional<
                        import("zod").ZodNullable<import("zod").ZodString>
                      >
                    >;
                    arcGisApiKey: import("zod").ZodOptional<
                      import("zod").ZodOptional<
                        import("zod").ZodNullable<import("zod").ZodString>
                      >
                    >;
                    jitsiAppName: import("zod").ZodOptional<
                      import("zod").ZodOptional<
                        import("zod").ZodNullable<import("zod").ZodString>
                      >
                    >;
                    what3WordsApiKey: import("zod").ZodOptional<
                      import("zod").ZodOptional<
                        import("zod").ZodNullable<import("zod").ZodString>
                      >
                    >;
                    allowedBiosOptions: import("zod").ZodOptional<
                      import("zod").ZodOptional<
                        import("zod").ZodNullable<
                          import("zod").ZodArray<
                            import("zod").ZodEnum<{
                              local: "local";
                              studio: "studio";
                              locked: "locked";
                              "enter join code": "enter join code";
                              "join inst": "join inst";
                              temp: "temp";
                              "static inst": "static inst";
                              "local inst": "local inst";
                              "public inst": "public inst";
                              "free inst": "free inst";
                              free: "free";
                              "private inst": "private inst";
                              "studio inst": "studio inst";
                              "sign in": "sign in";
                              "sign up": "sign up";
                              "sign out": "sign out";
                              "delete inst": "delete inst";
                            }>
                          >
                        >
                      >
                    >;
                    defaultBiosOption: import("zod").ZodOptional<
                      import("zod").ZodOptional<
                        import("zod").ZodNullable<
                          import("zod").ZodEnum<{
                            local: "local";
                            studio: "studio";
                            locked: "locked";
                            "enter join code": "enter join code";
                            "join inst": "join inst";
                            temp: "temp";
                            "static inst": "static inst";
                            "local inst": "local inst";
                            "public inst": "public inst";
                            "free inst": "free inst";
                            free: "free";
                            "private inst": "private inst";
                            "studio inst": "studio inst";
                            "sign in": "sign in";
                            "sign up": "sign up";
                            "sign out": "sign out";
                            "delete inst": "delete inst";
                          }>
                        >
                      >
                    >;
                    automaticBiosOption: import("zod").ZodOptional<
                      import("zod").ZodOptional<
                        import("zod").ZodNullable<
                          import("zod").ZodEnum<{
                            local: "local";
                            studio: "studio";
                            locked: "locked";
                            "enter join code": "enter join code";
                            "join inst": "join inst";
                            temp: "temp";
                            "static inst": "static inst";
                            "local inst": "local inst";
                            "public inst": "public inst";
                            "free inst": "free inst";
                            free: "free";
                            "private inst": "private inst";
                            "studio inst": "studio inst";
                            "sign in": "sign in";
                            "sign up": "sign up";
                            "sign out": "sign out";
                            "delete inst": "delete inst";
                          }>
                        >
                      >
                    >;
                    automaticBiosOptionInst: import("zod").ZodOptional<
                      import("zod").ZodOptional<
                        import("zod").ZodNullable<import("zod").ZodString>
                      >
                    >;
                    logoBackgroundColor: import("zod").ZodOptional<
                      import("zod").ZodOptional<
                        import("zod").ZodNullable<import("zod").ZodString>
                      >
                    >;
                    pageTitle: import("zod").ZodOptional<
                      import("zod").ZodOptional<
                        import("zod").ZodNullable<import("zod").ZodString>
                      >
                    >;
                    pageDescription: import("zod").ZodOptional<
                      import("zod").ZodOptional<
                        import("zod").ZodNullable<import("zod").ZodString>
                      >
                    >;
                    postHogApiKey: import("zod").ZodOptional<
                      import("zod").ZodOptional<
                        import("zod").ZodNullable<import("zod").ZodString>
                      >
                    >;
                    postHogApiHost: import("zod").ZodOptional<
                      import("zod").ZodOptional<
                        import("zod").ZodNullable<import("zod").ZodString>
                      >
                    >;
                    noAutomaticGridPortal: import("zod").ZodOptional<
                      import("zod").ZodOptional<
                        import("zod").ZodNullable<import("zod").ZodBoolean>
                      >
                    >;
                  },
                  import("zod/v4/core").$strip
                >
              >
            >;
            loomConfig: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodObject<
                  {
                    appId: import("zod").ZodString;
                    privateKey: import("zod").ZodString;
                  },
                  import("zod/v4/core").$strip
                >
              >
            >;
            humeConfig: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodObject<
                  {
                    apiKey: import("zod").ZodString;
                    secretKey: import("zod").ZodString;
                  },
                  import("zod/v4/core").$strip
                >
              >
            >;
            playerWebManifest: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodOptional<
                  import("zod").ZodObject<
                    {
                      name: import("zod").ZodString;
                      short_name: import("zod").ZodString;
                      description: import("zod").ZodOptional<
                        import("zod").ZodString
                      >;
                      start_url: import("zod").ZodPrefault<
                        import("zod").ZodString
                      >;
                      display: import("zod").ZodPrefault<
                        import("zod").ZodEnum<{
                          fullscreen: "fullscreen";
                          standalone: "standalone";
                          "minimal-ui": "minimal-ui";
                          browser: "browser";
                        }>
                      >;
                      background_color: import("zod").ZodPrefault<
                        import("zod").ZodString
                      >;
                      theme_color: import("zod").ZodPrefault<
                        import("zod").ZodString
                      >;
                      icons: import("zod").ZodPrefault<
                        import("zod").ZodArray<
                          import("zod").ZodObject<
                            {
                              src: import("zod").ZodString;
                              type: import("zod").ZodString;
                              sizes: import("zod").ZodUnion<
                                readonly [
                                  import("zod").ZodLiteral<"any">,
                                  import("zod").ZodString,
                                ]
                              >;
                              purpose: import("zod").ZodOptional<
                                import("zod").ZodString
                              >;
                            },
                            import("zod/v4/core").$strip
                          >
                        >
                      >;
                    },
                    import("zod/v4/core").$loose
                  >
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").UpdateStudioResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      addCustomDomain: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            studioId: import("zod").ZodString;
            domain: import("zod").ZodString;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          }
        | import("@casual-simulation/aux-common").GenericResult<
            import("@casual-simulation/aux-records").DomainNameVerificationDNSRecord[],
            import("@casual-simulation/aux-common").SimpleError
          >,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      deleteCustomDomain: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            customDomainId: import("zod").ZodString;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          }
        | import("@casual-simulation/aux-common").GenericResult<
            void,
            import("@casual-simulation/aux-common").SimpleError
          >,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      listCustomDomains: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            studioId: import("zod").ZodString;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          }
        | import("@casual-simulation/aux-common").GenericResult<
            {
              domains: import("@casual-simulation/aux-records").ListedCustomDomain[];
            },
            import("@casual-simulation/aux-common").SimpleError
          >,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      verifyCustomDomain: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            customDomainId: import("zod").ZodString;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          }
        | import("@casual-simulation/aux-common").GenericResult<
            void,
            import("@casual-simulation/aux-common").SimpleError
          >,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      requestStudioComId: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            studioId: import("zod").ZodString;
            comId: import("zod").ZodString;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").ComIdRequestResult
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      listStudios: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            comId: import("zod").ZodOptional<
              import("zod").ZodNullable<import("zod").ZodString>
            >;
            userId: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").ListStudiosSuccess
        | import("@casual-simulation/aux-records").ListStudiosFailure
        | {
            readonly success: false;
            readonly errorCode: "not_authorized";
            readonly errorMessage: "You are not authorized to perform this action.";
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      listStudioMembers: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            studioId: import("zod").ZodString;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").ListStudioMembersResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      addStudioMember: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            studioId: import("zod").ZodString;
            addedUserId: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            addedEmail: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            addedPhoneNumber: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            addedDisplayName: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            role: import("zod").ZodUnion<
              readonly [
                import("zod").ZodLiteral<"admin">,
                import("zod").ZodLiteral<"member">,
              ]
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").AddStudioMemberResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      removeStudioMember: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            studioId: import("zod").ZodString;
            removedUserId: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").RemoveStudioMemberResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      getManageStudioStoreLink: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            studioId: import("zod").ZodString;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          }
        | {
            success: false;
            errorCode: "not_supported";
            errorMessage: string;
          }
        | import("@casual-simulation/aux-common").GenericResult<
            {
              url: string;
            },
            import("@casual-simulation/aux-common").SimpleError
          >,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      getWebConfig: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<{}, import("zod/v4/core").$strip>,
        import("@casual-simulation/aux-common").GenericResult<
          import("@casual-simulation/aux-common").CasualOSConfig,
          import("@casual-simulation/aux-common").SimpleError
        >,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      getPlayerWebManifest: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<{}, import("zod/v4/core").$strip>,
        import("@casual-simulation/aux-common").GenericResult<
          {
            [x: string]: unknown;
            name: string;
            short_name: string;
            start_url: string;
            display: "fullscreen" | "browser" | "standalone" | "minimal-ui";
            background_color: string;
            theme_color: string;
            icons: {
              src: string;
              type: string;
              sizes?: string;
              purpose?: string;
            }[];
            description?: string;
          },
          import("@casual-simulation/aux-common").SimpleError
        >,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      getPlayerConfig: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            comId: import("zod").ZodString;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records").GetPlayerConfigResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      getBalances: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            studioId: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            contractId: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            userId: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").NoSessionKeyResult
        | {
            success: false;
            errorCode: "not_supported";
            errorMessage: string;
          }
        | import("@casual-simulation/aux-common").GenericResult<
            {
              usd: import("@casual-simulation/aux-common").JSONAccountBalance;
              credits: import("@casual-simulation/aux-common").JSONAccountBalance;
              subscription: import("@casual-simulation/aux-records").SubscriptionInfo;
            },
            import("@casual-simulation/aux-common").SimpleError
          >,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      listTransfers: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            accountId: import("zod").ZodString;
            minTimeMs: import("zod").ZodCoercedNumber<unknown>;
            maxTimeMs: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>
            >;
            limit: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").NoSessionKeyResult
        | {
            success: false;
            errorCode: "not_supported";
            errorMessage: string;
          }
        | import("@casual-simulation/aux-common").GenericResult<
            {
              balance: import("@casual-simulation/aux-common").JSONAccountBalance;
              transfers: import("@casual-simulation/aux-records").ListedTransfer[];
            },
            import("@casual-simulation/aux-common").SimpleError
          >,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      getSubscriptions: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            studioId: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            userId: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").GetSubscriptionStatusSuccess
        | import("@casual-simulation/aux-records").GetSubscriptionStatusFailure
        | {
            readonly success: true;
            readonly publishableKey: string;
            readonly subscriptions: {
              active: boolean;
              statusCode:
                | "unpaid"
                | "active"
                | "canceled"
                | "ended"
                | "past_due"
                | "incomplete"
                | "incomplete_expired"
                | "trialing"
                | "paused";
              productName: string;
              startDate: number;
              endedDate: number;
              cancelDate: number;
              canceledDate: number;
              currentPeriodStart: number;
              currentPeriodEnd: number;
              renewalInterval: "month" | "week" | "year" | "day";
              intervalLength: number;
              intervalCost: number;
              currency: string;
              featureList: string[];
              creditExpiration: "never-expire" | "expire-after-period";
            }[];
            readonly purchasableSubscriptions: {
              id: string;
              name: string;
              description: string;
              featureList: string[];
              prices: {
                id: string;
                interval: "month" | "year" | "week" | "day";
                intervalLength: number;
                currency: string;
                cost: number;
              }[];
              defaultSubscription: boolean;
            }[];
            readonly accountBalances: {
              usd: import("@casual-simulation/aux-common").JSONAccountBalance;
              credits: import("@casual-simulation/aux-common").JSONAccountBalance;
            };
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      getManageSubscriptionLink: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            userId: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            studioId: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            subscriptionId: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            expectedPrice: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodObject<
                  {
                    currency: import("zod").ZodString;
                    cost: import("zod").ZodNumber;
                    interval: import("zod").ZodEnum<{
                      month: "month";
                      week: "week";
                      year: "year";
                      day: "day";
                    }>;
                    intervalLength: import("zod").ZodNumber;
                  },
                  import("zod/v4/core").$strip
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").CreateManageSubscriptionResult
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      updateSubscription: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            userId: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            studioId: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            subscriptionId: import("zod").ZodNullable<import("zod").ZodString>;
            subscriptionStatus: import("zod").ZodNullable<
              import("zod").ZodEnum<{
                unpaid: "unpaid";
                active: "active";
                canceled: "canceled";
                ended: "ended";
                past_due: "past_due";
                incomplete: "incomplete";
                incomplete_expired: "incomplete_expired";
                trialing: "trialing";
                paused: "paused";
              }>
            >;
            subscriptionPeriodStartMs: import("zod").ZodNullable<
              import("zod").ZodInt
            >;
            subscriptionPeriodEndMs: import("zod").ZodNullable<
              import("zod").ZodInt
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").NoSessionKeyResult
        | import("@casual-simulation/aux-records").UpdateSubscriptionResult
        | {
            success: false;
            errorCode: "not_supported";
            errorMessage: string;
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      getManageXpAccountLink: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<{}, import("zod/v4/core").$strip>,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").NoSessionKeyResult
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          }
        | {
            success: false;
            errorCode: "not_supported";
            errorMessage: string;
          }
        | import("@casual-simulation/aux-common").GenericResult<
            {
              url: string;
            },
            import("@casual-simulation/aux-common").SimpleError
          >,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      getStripeLoginLink: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            studioId: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").NoSessionKeyResult
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          }
        | {
            success: false;
            errorCode: "not_supported";
            errorMessage: string;
          }
        | import("@casual-simulation/aux-common").GenericResult<
            {
              url: string;
            },
            import("@casual-simulation/aux-common").SimpleError
          >,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      recordContract: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            item: import("zod").ZodNonOptional<
              import("zod").ZodObject<
                {
                  address: import("zod").ZodString;
                  holdingUser: import("zod").ZodString;
                  rate: import("zod").ZodInt;
                  initialValue: import("zod").ZodInt;
                  description: import("zod").ZodNullable<
                    import("zod").ZodOptional<import("zod").ZodString>
                  >;
                  markers: import("zod").ZodPrefault<
                    import("zod").ZodNullable<
                      import("zod").ZodOptional<
                        import("zod").ZodArray<import("zod").ZodString>
                      >
                    >
                  >;
                },
                import("zod/v4/core").$strip
              >
            >;
            instances: import("zod").ZodOptional<
              import("zod").ZodPipe<
                import("zod").ZodTransform<unknown, unknown>,
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records/crud").CrudRecordItemResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      getContract: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodString;
            instances: import("zod").ZodOptional<
              import("zod").ZodPipe<
                import("zod").ZodTransform<unknown, unknown>,
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records/crud").CrudGetItemResult<any>,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      listContracts: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodOptional<
              import("zod").ZodNullable<import("zod").ZodString>
            >;
            marker: import("zod").ZodOptional<import("zod").ZodString>;
            sort: import("zod").ZodOptional<
              import("zod").ZodEnum<{
                ascending: "ascending";
                descending: "descending";
              }>
            >;
            instances: import("zod").ZodOptional<
              import("zod").ZodPipe<
                import("zod").ZodTransform<unknown, unknown>,
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records/crud").CrudListItemsFailure
        | import("@casual-simulation/aux-records/crud").CrudListItemsSuccess<any>
        | {
            success: false;
            errorCode: "not_supported";
            errorMessage: string;
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      eraseContract: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodString;
            instances: import("zod").ZodOptional<
              import("zod").ZodPipe<
                import("zod").ZodTransform<unknown, unknown>,
                import("zod").ZodArray<import("zod").ZodString>
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records/crud").CrudEraseItemResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      cancelContract: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodString;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").NoSessionKeyResult
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          }
        | {
            success: false;
            errorCode: "not_supported";
            errorMessage: string;
          }
        | import("@casual-simulation/aux-common").GenericResult<
            {
              refundedAmount: number;
              refundCurrency: string;
            },
            import("@casual-simulation/aux-common").SimpleError
          >,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      listInsts: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            inst: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            marker: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").NoSessionKeyResult
        | import("@casual-simulation/aux-records").ListInstsResult
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          }
        | {
            success: false;
            errorCode: "not_supported";
            errorMessage: string;
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      invoiceContract: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            contractId: import("zod").ZodString;
            amount: import("zod").ZodInt;
            note: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            payoutDestination: import("zod").ZodEnum<{
              account: "account";
              stripe: "stripe";
            }>;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").NoSessionKeyResult
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          }
        | {
            success: false;
            errorCode: "not_supported";
            errorMessage: string;
          }
        | import("@casual-simulation/aux-common").GenericResult<
            {
              invoiceId: string;
            },
            import("@casual-simulation/aux-common").SimpleError
          >,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      payContractInvoice: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            invoiceId: import("zod").ZodString;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").NoSessionKeyResult
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          }
        | {
            success: false;
            errorCode: "not_supported";
            errorMessage: string;
          }
        | import("@casual-simulation/aux-common").GenericResult<
            void,
            import("@casual-simulation/aux-common").SimpleError
          >,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      payoutAccount: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            userId: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            studioId: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            amount: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodInt>
            >;
            destination: import("zod").ZodEnum<{
              stripe: "stripe";
              cash: "cash";
            }>;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").NoSessionKeyResult
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          }
        | {
            success: false;
            errorCode: "not_supported";
            errorMessage: string;
          }
        | import("@casual-simulation/aux-common").GenericResult<
            {
              payoutId: string;
            },
            import("@casual-simulation/aux-common").SimpleError
          >,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      listContractInvoices: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            contractId: import("zod").ZodString;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").NoSessionKeyResult
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          }
        | {
            success: false;
            errorCode: "not_supported";
            errorMessage: string;
          }
        | import("@casual-simulation/aux-common").GenericResult<
            import("@casual-simulation/aux-records/contracts").ContractInvoice[],
            import("@casual-simulation/aux-common").SimpleError
          >,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      cancelInvoice: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            invoiceId: import("zod").ZodString;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").NoSessionKeyResult
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          }
        | {
            success: false;
            errorCode: "not_supported";
            errorMessage: string;
          }
        | import("@casual-simulation/aux-common").GenericResult<
            void,
            import("@casual-simulation/aux-common").SimpleError
          >,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      deleteInst: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordKey: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            recordName: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            inst: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").NoSessionKeyResult
        | import("@casual-simulation/aux-records").EraseInstResult
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          }
        | {
            success: false;
            errorCode: "not_supported";
            errorMessage: string;
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      reportInst: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodNullable<import("zod").ZodString>;
            inst: import("zod").ZodString;
            automaticReport: import("zod").ZodBoolean;
            reportReason: import("zod").ZodUnion<
              readonly [
                import("zod").ZodLiteral<"poor-performance">,
                import("zod").ZodLiteral<"spam">,
                import("zod").ZodLiteral<"harassment">,
                import("zod").ZodLiteral<"copyright-infringement">,
                import("zod").ZodLiteral<"obscene">,
                import("zod").ZodLiteral<"illegal">,
                import("zod").ZodLiteral<"other">,
              ]
            >;
            reportReasonText: import("zod").ZodString;
            reportedUrl: import("zod").ZodURL;
            reportedPermalink: import("zod").ZodURL;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").ReportInstResult
        | {
            success: false;
            errorCode: "not_supported";
            errorMessage: string;
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      getInstData: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodOptional<
              import("zod").ZodNullable<import("zod").ZodString>
            >;
            inst: import("zod").ZodString;
            branch: import("zod").ZodPrefault<import("zod").ZodString>;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | {
            success: true;
            data: import("@casual-simulation/aux-common").StoredAux;
          }
        | {
            success: false;
            errorCode:
              | import("@casual-simulation/aux-common").ServerError
              | "inst_not_found"
              | import("@casual-simulation/aux-records").ConstructAuthorizationContextFailure["errorCode"]
              | import("@casual-simulation/aux-records").AuthorizeSubjectFailure["errorCode"]
              | import("@casual-simulation/aux-records").GetOrCreateInstFailure["errorCode"];
            errorMessage: string;
            reason?: import("@casual-simulation/aux-common").DenialReason;
          },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      listProcedures: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<{}, import("zod/v4/core").$strip>,
        {
          version: string;
          versionHash: string;
          procedures: import("@casual-simulation/aux-common").ProcedureMetadata[];
          success: true;
        },
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      getPurchasableItem: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodString;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records/crud").CrudGetItemResult<
          import("@casual-simulation/aux-records").PurchasableItem
        >,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      listPurchasableItems: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodOptional<
              import("zod").ZodNullable<import("zod").ZodString>
            >;
            marker: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            sort: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodEnum<{
                  ascending: "ascending";
                  descending: "descending";
                }>
              >
            >;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | {
            success: false;
            errorCode: "not_supported";
            errorMessage: string;
          }
        | import("@casual-simulation/aux-records/crud").CrudListItemsResult<
            import("@casual-simulation/aux-records").PurchasableItem
          >,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      recordPurchasableItem: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            item: import("zod").ZodObject<
              {
                address: import("zod").ZodString;
                name: import("zod").ZodString;
                description: import("zod").ZodString;
                imageUrls: import("zod").ZodArray<import("zod").ZodString>;
                currency: import("zod").ZodString;
                cost: import("zod").ZodInt;
                taxCode: import("zod").ZodOptional<
                  import("zod").ZodNullable<import("zod").ZodString>
                >;
                roleName: import("zod").ZodString;
                roleGrantTimeMs: import("zod").ZodOptional<
                  import("zod").ZodNullable<import("zod").ZodInt>
                >;
                redirectUrl: import("zod").ZodOptional<
                  import("zod").ZodNullable<import("zod").ZodURL>
                >;
                markers: import("zod").ZodArray<import("zod").ZodString>;
              },
              import("zod/v4/core").$strip
            >;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records/crud").CrudRecordItemResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      erasePurchasableItem: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodString;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        import("@casual-simulation/aux-records/crud").CrudEraseItemResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      purchaseItem: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            item: import("zod").ZodObject<
              {
                address: import("zod").ZodString;
                expectedCost: import("zod").ZodInt;
                currency: import("zod").ZodString;
              },
              import("zod/v4/core").$strip
            >;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
            returnUrl: import("zod").ZodURL;
            successUrl: import("zod").ZodURL;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").CreatePurchaseItemLinkResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      purchaseContract: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            contract: import("zod").ZodObject<
              {
                address: import("zod").ZodString;
                expectedCost: import("zod").ZodInt;
                currency: import("zod").ZodPrefault<import("zod").ZodString>;
              },
              import("zod/v4/core").$strip
            >;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
            returnUrl: import("zod").ZodURL;
            successUrl: import("zod").ZodURL;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-common").GenericResult<
            {
              url?: string;
              sessionId: string;
            },
            import("@casual-simulation/aux-common").SimpleError
          >,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      purchaseCredits: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            targetUserId: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            targetStudioId: import("zod").ZodNullable<
              import("zod").ZodOptional<import("zod").ZodString>
            >;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
            returnUrl: import("zod").ZodURL;
            successUrl: import("zod").ZodURL;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          }
        | import("@casual-simulation/aux-common").GenericResult<
            {
              url?: string;
            },
            import("@casual-simulation/aux-common").SimpleError
          >,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      getContractPricing: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            recordName: import("zod").ZodString;
            address: import("zod").ZodString;
            instances: import("zod").ZodNullable<
              import("zod").ZodOptional<
                import("zod").ZodPipe<
                  import("zod").ZodTransform<unknown, unknown>,
                  import("zod").ZodArray<import("zod").ZodString>
                >
              >
            >;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-common").GenericResult<
            import("@casual-simulation/aux-records").ContractPricing,
            import("@casual-simulation/aux-common").SimpleError
          >,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      fulfillCheckoutSession: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            sessionId: import("zod").ZodString;
            activation: import("zod").ZodEnum<{
              now: "now";
              later: "later";
            }>;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").FulfillCheckoutSessionResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      claimActivationKey: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            activationKey: import("zod").ZodString;
            target: import("zod").ZodEnum<{
              self: "self";
              guest: "guest";
            }>;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | import("@casual-simulation/aux-records").ClaimActivationKeyResult,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      getConfigurationValue: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodObject<
          {
            key: import("zod").ZodEnum<{
              metadata: "metadata";
              subscriptions: "subscriptions";
              privo: "privo";
              moderation: "moderation";
              web: "web";
              playerWebManifest: "playerWebManifest";
              ab1Bootstrap: "ab1Bootstrap";
            }>;
          },
          import("zod/v4/core").$strip
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          }
        | import("@casual-simulation/aux-common").GenericResult<
            import("@casual-simulation/aux-records").ConfigurationOutput<
              | "metadata"
              | "subscriptions"
              | "privo"
              | "moderation"
              | "web"
              | "playerWebManifest"
              | "ab1Bootstrap"
            >,
            import("@casual-simulation/aux-common").SimpleError
          >,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
      setConfigurationValue: import("@casual-simulation/aux-common").Procedure<
        import("zod").ZodDiscriminatedUnion<
          [
            import("zod/v4/core").$ZodTypeDiscriminable,
            ...import("zod/v4/core").$ZodTypeDiscriminable[],
          ],
          "key"
        >,
        | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
        | {
            success: false;
            errorCode: "not_logged_in";
            errorMessage: "The user is not logged in. A session key must be provided for this operation.";
          }
        | import("@casual-simulation/aux-common").GenericResult<
            void,
            import("@casual-simulation/aux-common").SimpleError
          >,
        import("zod").ZodType<
          unknown,
          unknown,
          import("zod/v4/core").$ZodTypeInternals<unknown, unknown>
        >
      >;
    }>;
  connectionId: string;
  sessionKey: import("@preact/signals").Signal<string | null>;
  parsedSessionKey: import("@preact/signals").ReadonlySignal<{
    userId: string;
    sessionId: string;
    sessionSecret: string;
    expireTimeMs: number;
  } | null>;
  connectionKey: import("@preact/signals").Signal<string | null>;
  sessionInvalidated: import("@preact/signals").Signal<SessionInvalidatedEvent | null>;
  getData: (
    recordName: string,
    address: string
  ) => Promise<
    | import("@casual-simulation/aux-records").GetDataSuccess
    | import("@casual-simulation/aux-records").GetDataFailure
    | {
        readonly success: false;
        readonly errorCode: "unacceptable_request";
        readonly errorMessage: "recordName is required and must be a string.";
      }
    | {
        readonly success: false;
        readonly errorCode: "unacceptable_request";
        readonly errorMessage: "address is required and must be a string.";
      }
  >;
  recordData: (
    recordKey: string,
    address: string,
    data: unknown,
    options: {
      marker?: string;
    }
  ) => Promise<
    | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
    | import("@casual-simulation/aux-records").RecordDataSuccess
    | import("@casual-simulation/aux-records").RecordDataFailure
    | {
        readonly success: false;
        readonly errorCode: "unacceptable_request";
        readonly errorMessage: "recordKey is required and must be a string.";
      }
    | {
        readonly success: false;
        readonly errorCode: "unacceptable_request";
        readonly errorMessage: "address is required and must be a string.";
      }
    | {
        readonly success: false;
        readonly errorCode: "unacceptable_request";
        readonly errorMessage: "data is required.";
      }
  >;
  eraseData: (
    recordKey: string,
    address: string
  ) => Promise<
    | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
    | import("@casual-simulation/aux-records").EraseDataSuccess
    | import("@casual-simulation/aux-records").EraseDataFailure
    | {
        readonly success: false;
        readonly errorCode: "unacceptable_request";
        readonly errorMessage: "recordKey is required and must be a string.";
      }
    | {
        readonly success: false;
        readonly errorCode: "unacceptable_request";
        readonly errorMessage: "address is required and must be a string.";
      }
  >;
  listDataByMarker: (
    recordName: string,
    marker: string,
    lastAddress?: string
  ) => Promise<
    | import("@casual-simulation/aux-records").ValidateSessionKeyFailure
    | import("@casual-simulation/aux-records").ListDataSuccess
    | import("@casual-simulation/aux-records").ListDataFailure
    | {
        readonly success: false;
        readonly errorCode: "unacceptable_request";
        readonly errorMessage: "recordName is required and must be a string.";
      }
    | {
        readonly success: false;
        readonly errorCode: "unacceptable_request";
        readonly errorMessage: "address must be null or a string.";
      }
  >;
  listAllDataByMarker: (
    recordName: string,
    marker: string
  ) => Promise<{
    success: boolean;
    items: {
      address: string;
      data: unknown;
    }[];
  }>;
  recordFile: (
    recordKey: string,
    data: object | string | number | boolean,
    options: {
      mimeType?: string;
      marker?: string;
    }
  ) => Promise<{
    success: boolean;
    url: string;
  }>;
  requestWakeLock: () => Promise<WakeLockSentinel | null>;
  disableWakeLock: () => Promise<void>;
  getSharedDocument: (
    recordName: string | null,
    inst: string,
    docName: string,
    options?: {
      markers?: string[];
    }
  ) => Promise<SharedDocument>;
  promptToInstallPWA: () => Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};
/**
 * Uploads a file to the records server. Returns the URL of the file that was uploaded.
 * @param recordNameOrKey The name or key of the record to upload to.
 * @param data The data to upload
 * @param sessionKey The session key to use for authentication.
 */
export declare function uploadFile(
  recordNameOrKey: string,
  data: object | string | number | boolean,
  client: ReturnType<typeof createRecordsClient>,
  markers?: string[],
  providedMimeType?: string
): Promise<{
  fileUrl: string;
  sha256Hash: string;
}>;
