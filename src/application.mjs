import { createActivityPubMultiSiteServerEngine } from "@red-cup-engineering/activitypub-server";
import { serveManagedActivityPubSites } from "@red-cup-engineering/activitypub-server/managed-sites";

// The managed Node-facing application retains the original public API.
// Fetch-only consumers use ./fetch instead and do not import these host ports.
export { createMooseSite, createMoosePublicReaders, createMooseApplication } from "./fetch.mjs";

/** The original ActivityPub multisite host resolves each WebFinger/actor/outbox. */
export const createMooseEngine = ({ sites }) => createActivityPubMultiSiteServerEngine({ sites });

/** The original managed host owns worker lifecycle and source custody release. */
export const serveMooseSites = options => serveManagedActivityPubSites(options);
