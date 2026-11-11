import { createLivingWebHost, serveLivingWebHost } from "@red-cup-engineering/living-web-server/host";
import { createActivityPubSiteApplication } from "@red-cup-engineering/activitypub-server";
import { serveManagedActivityPubSites } from "@red-cup-engineering/activitypub-server/managed-sites";

/**
 * MOOSE composes its original site applications on the Living Web host.
 * ActivityPub owns each site's protocol and identity boundary; Living Web
 * owns origin dispatch and the Web Server listener. No second router,
 * worker supervisor, key store or custody registry is created here.
 */
export function createMooseEngine({ sites } = {}) {
  if (!Array.isArray(sites) || sites.length === 0) {
    throw new TypeError("MOOSE hosting requires one or more original sites");
  }
  return createLivingWebHost({
    applications: sites.map(site => createActivityPubSiteApplication(site)),
  });
}

function serveMooseListener({ sites, hostname, port, trustProxy }) {
  return serveLivingWebHost(createMooseEngine({ sites }), { hostname, port, trustProxy });
}

/**
 * The ActivityPub owner admits independent queues/custody and retains their
 * lifetime. Its existing listener seam commissions Living Web by default.
 * An explicitly supplied serve port keeps the established host-test API.
 */
export function serveMooseSites({ serve = serveMooseListener, ...options } = {}) {
  return serveManagedActivityPubSites({ ...options, serve });
}
