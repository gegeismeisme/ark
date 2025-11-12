import { device, element, by, waitFor, expect } from "detox";

const email = process.env.DETOX_USER_EMAIL ?? "qa@example.com";
const password = process.env.DETOX_USER_PASSWORD ?? "Password123!";
const taskTitle = process.env.DETOX_TASK_TITLE ?? "Detox Smoke Assignment";
const taskDescription =
  process.env.DETOX_TASK_DESCRIPTION ?? "Auto-published via Detox smoke suite.";
const completionNote =
  process.env.DETOX_COMPLETION_NOTE ?? "Submission captured by Detox automation.";

const waitForHome = async () => {
  await waitFor(element(by.text("Mobile task workspace")))
    .toBeVisible()
    .withTimeout(20000);
};

const dismissKeyboard = async () => {
  if (device.getPlatform() === "android") {
    try {
      await device.pressBack();
    } catch {
      // no-op
    }
  } else {
    try {
      await element(by.text("New task")).tap();
    } catch {
      // focus shift best-effort
    }
  }
};

const closeAlertIfPresent = async () => {
  try {
    await waitFor(element(by.text("Publish task")))
      .toBeVisible()
      .withTimeout(3000);
    await element(by.text("OK")).tap();
  } catch {
    // Alert not shown
  }
};

const signInIfNeeded = async () => {
  try {
    await waitFor(element(by.id("auth-email-input")))
      .toBeVisible()
      .withTimeout(2000);
    await element(by.id("auth-email-input")).replaceText(email);
    await element(by.id("auth-password-input")).replaceText(password);
    await element(by.id("auth-submit-button")).tap();
    await waitForHome();
  } catch {
    await waitForHome();
  }
};

describe("Mobile publish and execute smoke", () => {
  beforeAll(async () => {
    await device.launchApp({ delete: true, newInstance: true });
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it("publishes a task and submits an update", async () => {
    await signInIfNeeded();

    await element(by.text("Publish")).tap();
    await waitFor(element(by.text("New task")))
      .toBeVisible()
      .withTimeout(10000);

    await element(by.text("Field inspection")).tap();

    await element(by.id("publish-title-input")).replaceText(taskTitle);
    await element(by.id("publish-description-input")).replaceText(taskDescription);
    await dismissKeyboard();

    await element(by.id("publish-submit-button")).tap();
    await closeAlertIfPresent();

    await element(by.text("Tasks")).tap();
    await waitFor(element(by.text(taskTitle)))
      .toBeVisible()
      .withTimeout(20000);
    await element(by.text(taskTitle)).atIndex(0).tap();

    await waitFor(element(by.text("Submit update")))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.text("Submit update")).tap();

    await waitFor(element(by.id("completion-note-input")))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.id("completion-note-input")).replaceText(completionNote);
    await dismissKeyboard();

    await element(by.id("completion-submit-button")).tap();
    await waitFor(element(by.id("completion-submit-button")))
      .toBeNotVisible()
      .withTimeout(10000);

    await element(by.id("completion-close-button")).tap();
    await expect(element(by.text(taskTitle))).toBeVisible();
  });
});
