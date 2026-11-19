# iCloud sync setup (CloudKit)

Greeting Card Studio can keep cards, people, occasions, favourites and your signature in step across devices using **your own private iCloud database**. This needs a one-off setup in Apple's developer tools. You need an Apple Developer Program membership.

Menu names below are from Apple's CloudKit Console and may differ slightly as Apple updates it.

## 1. Create (or choose) a container

1. Go to <https://developer.apple.com/account> → **Certificates, Identifiers & Profiles** → **Identifiers**.
2. Choose **iCloud Containers** from the filter, then **+**.
3. Give it an identifier such as `iCloud.com.yourname.greetingcardstudio`.

To share data with an iOS app later, use that app's existing container instead of creating a new one.

## 2. Create an API token

1. Open the CloudKit Console at <https://icloud.developer.apple.com> and select the container.
2. Open **Tokens & Keys** (called *API Access* in older versions) → **API Tokens** → **+**.
3. Name it, leave **Sign in callback** on **postMessage**, and under **Allowed origins** enter the site's address, e.g. `https://your-name.github.io`.
4. Save, then copy the token.

Tokens are per environment: create one for **Development** now and another for **Production** in step 4.

## 3. Connect the app (Development)

1. In the app: **Settings → iCloud sync**. Paste the container ID and token, leave **Development** selected, and tap **Save and connect**.
2. Tap the **Sign in with Apple** button that appears and sign in.
3. Tap **Sync now**. The first sync creates the `StudioBlob` record type automatically.

## 4. Go to Production

1. In the CloudKit Console: **Schema → Deploy Schema Changes…** to copy the record type to Production.
2. Create a **Production** API token (step 2, with the environment switched to Production).
3. Either enter the Production token under Settings on each device, or put the values in `src/config.ts` and redeploy so every device is configured automatically:

```ts
export const CLOUDKIT = {
  containerId: 'iCloud.com.yourname.greetingcardstudio',
  apiToken: 'your-production-token',
  environment: 'production',
};
```

Development and Production are separate databases. After switching, each device uploads what it holds and the copies merge.

## How sync behaves

- Each card syncs on its own; the most recently edited copy wins.
- Favourites, occasions, people and shared preferences sync together. If two devices changed them at the same time, the lists are merged.
- Deleting a card removes it everywhere, unless another device edited it after the delete.
- Cards upload when you leave the editor, when the app returns to the foreground, and every few minutes.
- Cards are stored as `StudioBlob` records in a private zone named `GreetingCardStudio`, split into chunks of about 300 KB so photo cards fit CloudKit's record size limit.
- Apple signs you out periodically (two weeks if you tick "Keep me signed in"); sync pauses until you sign in again.
