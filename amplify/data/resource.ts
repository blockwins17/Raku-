import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

/*
  Raku's Amplify Data schema.

  Three models cover the dashboard:
    - Task         : a unit of school work (manual / Brightspace / Notion / gcal / raku).
    - Event        : a class, exam, assignment deadline, or calendar event.
    - Integration  : a connection tile (brightspace, google, notion) with status.

  Auth: publicApiKey for now so the UI works without user sign-in.
  Switch to `allow.owner()` + Cognito when you're ready for multi-user.
*/
const schema = a.schema({
  Task: a
    .model({
      title: a.string().required(),
      course: a.string(),
      dueAt: a.datetime(),
      effortMin: a.integer().default(30),
      importance: a.integer().default(3),
      status: a.enum(["todo", "doing", "done", "later"]),
      source: a.enum(["manual", "brightspace", "notion", "googleCalendar", "raku"]),
      steps: a.string().array(),
    })
    .authorization((allow) => [allow.publicApiKey()]),

  Event: a
    .model({
      title: a.string().required(),
      course: a.string(),
      startAt: a.datetime().required(),
      endAt: a.datetime(),
      kind: a.enum(["classroom", "exam", "assignment", "event"]),
      source: a.enum(["manual", "googleCalendar", "brightspace", "notion", "raku"]),
    })
    .authorization((allow) => [allow.publicApiKey()]),

  Integration: a
    .model({
      integrationId: a.string().required(),
      name: a.string().required(),
      description: a.string(),
      status: a.enum(["ready", "mock", "live", "disconnected"]),
      lastSyncAt: a.datetime(),
    })
    .authorization((allow) => [allow.publicApiKey()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
