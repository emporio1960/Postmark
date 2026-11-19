// iCloud (CloudKit) sync configuration.
//
// Fill these in to switch sync on for everyone who uses this deployment.
// Both values are safe to publish: the API token only lets a signed-in
// person reach THEIR OWN private iCloud database. See CLOUDKIT.md.
// Leaving them empty lets each device enter them under Settings instead.
export const CLOUDKIT = {
  containerId: '',
  apiToken: '',
  environment: 'development' as 'development' | 'production',
};
